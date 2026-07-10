import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from 'date-fns';
import { TimesheetWeek } from '@/components/timesheets/TimesheetWeek';

export const dynamic = 'force-dynamic';

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
    ? new Date(sp.week)
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const viewUserId = sp.user ?? user.id;

  // Get or create timesheet period
  const { data: existing } = await supabase
    .from('timesheet_periods')
    .select('*')
    .eq('user_id', viewUserId)
    .eq('period_start', format(weekStart, 'yyyy-MM-dd'))
    .single();

  let period = existing;
  if (!period) {
    const { data: newPeriod } = await supabase
      .from('timesheet_periods')
      .insert({
        user_id: viewUserId,
        period_start: format(weekStart, 'yyyy-MM-dd'),
        period_end: format(weekEnd, 'yyyy-MM-dd'),
      })
      .select()
      .single();
    period = newPeriod;
  }

  // Get entries
  const { data: entries } = period
    ? await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('period_id', period.id)
        .order('work_date')
    : { data: [] };

  // Default working pattern
  const { data: workingPattern } = await supabase
    .from('working_patterns')
    .select('*')
    .eq('user_id', viewUserId)
    .eq('is_current', true)
    .single();

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isLocked = period?.is_locked ?? false;
  const canEdit = (!isLocked || isManagerOrAdmin) && (viewUserId === user.id || isManagerOrAdmin);

  const prevWeek = format(addWeeks(weekStart, -1), 'yyyy-MM-dd');
  const nextWeek = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <h2 className="text-lg font-bold text-gray-800">Timesheets</h2>

      <TimesheetWeek
        periodId={period?.id ?? ''}
        userId={viewUserId}
        currentUserId={user.id}
        days={days.map(d => format(d, 'yyyy-MM-dd'))}
        entries={entries ?? []}
        workingPattern={workingPattern}
        weekStartStr={format(weekStart, 'yyyy-MM-dd')}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
        isLocked={isLocked}
        canEdit={canEdit}
      />
    </div>
  );
}
