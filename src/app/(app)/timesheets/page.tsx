import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from 'date-fns';
import { TimesheetWeek } from '@/components/timesheets/TimesheetWeek';
import { TimesheetStaffOverview } from '@/components/timesheets/TimesheetStaffOverview';

export const dynamic = 'force-dynamic';

const DAY_KEYS: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

export default async function TimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; user?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.timesheet_access) redirect('/dashboard');

  const sp = await searchParams;
  const weekStart = sp.week
    ? new Date(sp.week + 'T12:00:00')
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const viewUserId = sp.user ?? user.id;

  // Get or create timesheet period (retry after failed insert handles unique-constraint races)
  const { data: existing } = await supabase
    .from('timesheet_periods')
    .select('*')
    .eq('user_id', viewUserId)
    .eq('period_start', weekStartStr)
    .single();

  let period = existing;
  if (!period) {
    const { data: newPeriod } = await supabase
      .from('timesheet_periods')
      .insert({
        user_id: viewUserId,
        period_start: weekStartStr,
        period_end: weekEndStr,
      })
      .select()
      .single();

    if (newPeriod) {
      period = newPeriod;
    } else {
      // Insert failed (period already exists but wasn't SELECTable — re-fetch)
      const { data: retried } = await supabase
        .from('timesheet_periods')
        .select('*')
        .eq('user_id', viewUserId)
        .eq('period_start', weekStartStr)
        .single();
      period = retried;
    }
  }

  // Fetch working pattern, approved leave and sickness in parallel
  const [
    { data: workingPattern },
    { data: leaveThisWeek },
    { data: sicknessThisWeek },
  ] = await Promise.all([
    supabase.from('working_patterns').select('*').eq('user_id', viewUserId).eq('is_current', true).single(),
    supabase.from('holidays').select('start_date, end_date').eq('user_id', viewUserId).eq('status', 'approved').lte('start_date', weekEndStr).gte('end_date', weekStartStr),
    supabase.from('sickness_records').select('start_date, end_date').eq('user_id', viewUserId).lte('start_date', weekEndStr).or(`end_date.is.null,end_date.gte.${weekStartStr}`),
  ]);

  // Get existing entries
  let entries: any[] = [];
  if (period) {
    const { data } = await supabase
      .from('timesheet_entries')
      .select('*')
      .eq('period_id', period.id)
      .order('work_date');
    entries = data ?? [];
  }

  // Auto-populate missing working days (skip leave/sickness days)
  if (period) {
    const wp = workingPattern as any;
    const existingDates = new Set(entries.map((e: any) => e.work_date));

    // Derive hours per day
    const workingDayCount = wp
      ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].filter(d => wp[d]).length
      : 5;
    const hoursPerDay = wp?.weekly_hours ? wp.weekly_hours / (workingDayCount || 5) : 8;
    const endHour = 8 + Math.floor(hoursPerDay);
    const endMin = Math.round((hoursPerDay % 1) * 60);
    const defaultStart = '08:00:00';
    const defaultEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    const missingDays = days
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(dateStr => {
        if (existingDates.has(dateStr)) return false;

        const dow = new Date(dateStr + 'T12:00:00').getDay();
        if (wp) {
          if (!wp[DAY_KEYS[dow]]) return false;
        } else {
          if (dow === 0 || dow === 6) return false;
        }

        const onLeave = (leaveThisWeek ?? []).some(
          (h: any) => dateStr >= h.start_date && dateStr <= h.end_date
        );
        if (onLeave) return false;

        const onSick = (sicknessThisWeek ?? []).some(
          (s: any) => dateStr >= s.start_date && (s.end_date === null || dateStr <= s.end_date)
        );
        if (onSick) return false;

        return true;
      });

    if (missingDays.length > 0) {
      await supabase.from('timesheet_entries').insert(
        missingDays.map(dateStr => ({
          period_id: period!.id,
          user_id: viewUserId,
          work_date: dateStr,
          start_time: defaultStart,
          end_time: defaultEnd,
          is_auto_populated: true,
        }))
      );

      const { data: refreshed } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('period_id', period.id)
        .order('work_date');
      entries = refreshed ?? [];
    }
  }

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  let staffOverview: Array<{ userId: string; name: string; status: 'not_started' | 'draft' | 'submitted' | 'approved' }> = [];

if (isManagerOrAdmin) {
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name');

  if (allProfiles?.length) {
    const { data: weekPeriods } = await supabase
      .from('timesheet_periods')
      .select('user_id, status, is_locked')
      .eq('period_start', weekStartStr)
      .in('user_id', allProfiles.map(p => p.id));

    const periodMap = new Map((weekPeriods ?? []).map(p => [p.user_id, p]));

    staffOverview = allProfiles.map(p => {
      const period = periodMap.get(p.id);
      let status: 'not_started' | 'draft' | 'submitted' | 'approved' = 'not_started';
      if (period) status = (period.status as any) ?? (period.is_locked ? 'submitted' : 'draft');
      return { userId: p.id, name: p.full_name, status };
    });
  }
}
  const isLocked = period?.is_locked ?? false;
  const canEdit = (!isLocked || isManagerOrAdmin) && (viewUserId === user.id || isManagerOrAdmin);

  const prevWeek = format(addWeeks(weekStart, -1), 'yyyy-MM-dd');
  const nextWeek = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');

 return (
  <div className="p-4 space-y-4 max-w-3xl mx-auto">
    <h2 className="text-lg font-bold text-gray-800">Timesheets</h2>

    {isManagerOrAdmin && staffOverview.length > 0 && (
      <TimesheetStaffOverview
        staff={staffOverview}
        weekStartStr={weekStartStr}
        currentUserId={user.id}
      />
    )}

    <TimesheetWeek
      periodId={period?.id ?? ''}
      userId={viewUserId}
      currentUserId={user.id}
      days={days.map(d => format(d, 'yyyy-MM-dd'))}
      entries={entries ?? []}
      workingPattern={workingPattern}
      weekStartStr={weekStartStr}
      prevWeek={prevWeek}
      nextWeek={nextWeek}
      isLocked={isLocked}
      periodStatus={(period as any)?.status ?? 'draft'}
      canEdit={canEdit}
      isManagerView={viewUserId !== user.id && isManagerOrAdmin}
      weekLabel={`${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`}
    />
  </div>
);
