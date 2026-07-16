'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

type Indicator = 'leave' | 'sick';

export function LeaveIndicatorBanner() {
  const sp = useSearchParams();
  const weekStr = sp.get('week');
  const userIdParam = sp.get('user');
  const [indicators, setIndicators] = useState<Record<string, Indicator>>({});

  useEffect(() => {
    const weekStart = weekStr
      ? new Date(weekStr + 'T12:00:00')
      : startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(d => format(d, 'yyyy-MM-dd'));

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const viewUserId = userIdParam || user.id;

      const [{ data: leave }, { data: sick }] = await Promise.all([
        supabase.from('holidays').select('start_date, end_date')
          .eq('user_id', viewUserId).eq('status', 'approved')
          .lte('start_date', weekEndStr).gte('end_date', weekStartStr),
        supabase.from('sickness_records').select('start_date, end_date')
          .eq('user_id', viewUserId)
          .lte('start_date', weekEndStr)
          .or('end_date.is.null,end_date.gte.' + weekStartStr),
      ]);

      const result: Record<string, Indicator> = {};
      for (const dateStr of days) {
        const onLeave = (leave ?? []).some(h => dateStr >= h.start_date && dateStr <= h.end_date);
        const onSick = (sick ?? []).some(s => dateStr >= s.start_date && (s.end_date === null || dateStr <= s.end_date));
        if (onLeave) result[dateStr] = 'leave';
        else if (onSick) result[dateStr] = 'sick';
      }
      setIndicators(result);
    })();
  }, [weekStr, userIdParam]);

  const entries = Object.entries(indicators);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2 max-w-3xl mx-auto">
      {entries.map(([dateStr, type]) => (
        <span
          key={dateStr}
          className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (
            type === 'leave' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}
        >
          {format(new Date(dateStr + 'T12:00:00'), 'EEE d MMM')}: {type === 'leave' ? 'Annual leave' : 'Sick leave'}
        </span>
      ))}
    </div>
  );
}
