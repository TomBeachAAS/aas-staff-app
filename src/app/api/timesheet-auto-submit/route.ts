import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export const dynamic = 'force-dynamic';

const DAY_KEYS: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(d => format(d, 'yyyy-MM-dd'));
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('timesheet_access', true)
    .eq('status', 'active');

  if (!staff?.length) return NextResponse.json({ processed: 0, week: weekStartStr });

  let processed = 0;

  for (const member of staff) {
    try {
      // Get or create period
      const { data: existing } = await supabase
        .from('timesheet_periods')
        .select('*')
        .eq('user_id', member.id)
        .eq('period_start', weekStartStr)
        .single();

      let period = existing;
      if (!period) {
        const { data: newPeriod } = await supabase
          .from('timesheet_periods')
          .insert({ user_id: member.id, period_start: weekStartStr, period_end: weekEndStr })
          .select()
          .single();
        period = newPeriod;
      }
      if (!period) continue;

      // Skip if already locked
      if (period.is_locked) continue;

      const [
        { data: wp },
        { data: leave },
        { data: sickness },
        { data: existingEntries },
      ] = await Promise.all([
        supabase.from('working_patterns').select('*').eq('user_id', member.id).eq('is_current', true).single(),
        supabase.from('holidays').select('start_date, end_date').eq('user_id', member.id).eq('status', 'approved').lte('start_date', weekEndStr).gte('end_date', weekStartStr),
        supabase.from('sickness_records').select('start_date, end_date').eq('user_id', member.id).lte('start_date', weekEndStr).or(`end_date.is.null,end_date.gte.${weekStartStr}`),
        supabase.from('timesheet_entries').select('work_date').eq('period_id', period.id),
      ]);

      const existingDates = new Set((existingEntries ?? []).map((e: any) => e.work_date));

      const workingDayCount = wp
        ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].filter(d => (wp as any)[d]).length
        : 5;
      const hoursPerDay = (wp as any)?.weekly_hours ? (wp as any).weekly_hours / (workingDayCount || 5) : 8;
      const endHour = 8 + Math.floor(hoursPerDay);
      const endMin = Math.round((hoursPerDay % 1) * 60);
      const defaultStart = '08:00:00';
      const defaultEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

      const missingDays = days.filter(dateStr => {
        if (existingDates.has(dateStr)) return false;
        const dow = new Date(dateStr + 'T12:00:00').getDay();
        if (wp) { if (!(wp as any)[DAY_KEYS[dow]]) return false; }
        else { if (dow === 0 || dow === 6) return false; }
        const onLeave = (leave ?? []).some((h: any) => dateStr >= h.start_date && dateStr <= h.end_date);
        if (onLeave) return false;
        const onSick = (sickness ?? []).some((s: any) => dateStr >= s.start_date && (s.end_date === null || dateStr <= s.end_date));
        if (onSick) return false;
        return true;
      });

      if (missingDays.length > 0) {
        await supabase.from('timesheet_entries').insert(
          missingDays.map(dateStr => ({
            period_id: period.id,
            user_id: member.id,
            work_date: dateStr,
            start_time: defaultStart,
            end_time: defaultEnd,
            is_auto_populated: true,
          }))
        );
      }

      // Lock the period
      await supabase
        .from('timesheet_periods')
        .update({ is_locked: true })
        .eq('id', period.id);

      // In-app notification
      await supabase.from('notifications').insert({
        user_id: member.id,
        title: 'Timesheet submitted',
        body: `Your timesheet for ${weekLabel} has been automatically submitted. If your hours look wrong, speak to your manager.`,
        link: `/timesheets?week=${weekStartStr}`,
        read: false,
      });

      processed++;
    } catch (err) {
      console.error(`Timesheet auto-submit failed for ${member.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, processed, week: weekStartStr });
}
