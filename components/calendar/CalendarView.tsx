'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, addWeeks, subMonths, subWeeks,
  isSameMonth, isSameDay, isToday, parseISO, eachDayOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CALENDAR_EVENT_COLOURS, CALENDAR_EVENT_LABELS, cn } from '@/lib/utils';
import type { CalendarEvent, BankHoliday, Profile } from '@/types/database';

const VIEWS = ['day', 'week', 'month', 'timeline'] as const;
type CalView = typeof VIEWS[number];

interface Props {
  currentUserId: string;
  profile: Profile;
  initialView: CalView;
  initialDate: string;
  allStaff: Pick<Profile, 'id' | 'full_name' | 'role'>[] | null;
  bankHolidays: BankHoliday[];
}

export function CalendarView({ currentUserId, profile, initialView, initialDate, allStaff, bankHolidays }: Props) {
  const [view, setView] = useState<CalView>(initialView);
  const [current, setCurrent] = useState(() => parseISO(initialDate));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let start: Date, end: Date;

    if (view === 'day') { start = current; end = current; }
    else if (view === 'week') { start = startOfWeek(current, { weekStartsOn: 1 }); end = endOfWeek(current, { weekStartsOn: 1 }); }
    else if (view === 'month') { start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 }); end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 }); }
    else { start = startOfWeek(current, { weekStartsOn: 1 }); end = addDays(start, 27); } // 4-week timeline

    let query = supabase
      .from('calendar_events')
      .select('*, user:profiles(id, full_name), customer:customers(company_name), location:locations(name)')
      .gte('start_datetime', start.toISOString())
      .lte('end_datetime', end.toISOString() + 'T23:59:59')
      .order('start_datetime');

    // Employees only see own events
    if (!isManagerOrAdmin) {
      query = query.eq('user_id', currentUserId);
    }

    const { data } = await query;
    setEvents((data as CalendarEvent[]) ?? []);
    setLoading(false);
  }, [view, current, currentUserId, isManagerOrAdmin]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function navigate(dir: 1 | -1) {
    if (view === 'day') setCurrent(d => addDays(d, dir));
    else if (view === 'week') setCurrent(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else if (view === 'month') setCurrent(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
    else setCurrent(d => addDays(d, dir * 7 * 4));
  }

  const bankHolidayMap = new Map(bankHolidays.map(bh => [bh.date, bh.name]));

  function getEventsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(e => {
      const start = e.start_datetime.split('T')[0];
      const end = e.end_datetime.split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
  }

  function EventChip({ event }: { event: CalendarEvent }) {
    const colour = CALENDAR_EVENT_COLOURS[event.event_type] ?? 'bg-gray-100 text-gray-700';
    const label = event.title ?? CALENDAR_EVENT_LABELS[event.event_type] ?? event.event_type;
    const user = event.user as Pick<Profile, 'full_name'> | undefined;
    return (
      <div className={cn('text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80', colour)}>
        {isManagerOrAdmin && user ? `${user.full_name.split(' ')[0]}: ` : ''}{label}
      </div>
    );
  }

  // ── Month view ──────────────────────────────────────────────
  function MonthView() {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
          {days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = getEventsForDay(day);
            const bh = bankHolidayMap.get(dayStr);
            const inMonth = isSameMonth(day, current);
            return (
              <div
                key={dayStr}
                className={cn(
                  'border-b border-r border-gray-50 p-1 min-h-0 flex flex-col overflow-hidden',
                  !inMonth && 'bg-gray-50/50',
                  isToday(day) && 'bg-aas-blue-50'
                )}
              >
                <div className={cn(
                  'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0',
                  isToday(day) ? 'bg-aas-blue text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'
                )}>
                  {format(day, 'd')}
                </div>
                {bh && (
                  <div className="text-[10px] text-purple-600 font-medium truncate mb-0.5">{bh}</div>
                )}
                <div className="flex-1 overflow-hidden space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => <EventChip key={ev.id} event={ev} />)}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Week view ──────────────────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(current, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-w-[600px]">
          {/* Headers */}
          {days.map(day => {
            const bh = bankHolidayMap.get(format(day, 'yyyy-MM-dd'));
            return (
              <div key={day.toISOString()} className={cn(
                'p-2 border-b border-r border-gray-100 text-center',
                isToday(day) && 'bg-aas-blue-50'
              )}>
                <p className="text-xs text-gray-400">{format(day, 'EEE')}</p>
                <p className={cn('text-sm font-semibold', isToday(day) ? 'text-aas-blue' : 'text-gray-700')}>
                  {format(day, 'd')}
                </p>
                {bh && <p className="text-[10px] text-purple-600 truncate">{bh}</p>}
              </div>
            );
          })}
          {/* Events */}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            return (
              <div key={day.toISOString()} className={cn(
                'p-1.5 border-r border-b border-gray-50 min-h-32 space-y-1',
                isToday(day) && 'bg-aas-blue-50/50'
              )}>
                {dayEvents.map(ev => <EventChip key={ev.id} event={ev} />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Timeline view (manager only) ───────────────────────────
  function TimelineView() {
    const staff = allStaff ?? [];
    const timelineStart = startOfWeek(current, { weekStartsOn: 1 });
    const days = Array.from({ length: 28 }, (_, i) => addDays(timelineStart, i));

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Date headers */}
          <div className="flex sticky top-0 bg-white z-10 border-b border-gray-100">
            <div className="w-36 shrink-0 border-r border-gray-100 px-3 py-2 text-xs font-semibold text-gray-400">Staff</div>
            {days.map(day => {
              const bh = bankHolidayMap.get(format(day, 'yyyy-MM-dd'));
              return (
                <div key={day.toISOString()} className={cn(
                  'flex-1 min-w-[28px] text-center py-1 border-r border-gray-50 text-[10px]',
                  isToday(day) && 'bg-aas-blue text-white',
                  bh && !isToday(day) && 'bg-purple-50'
                )}>
                  <div>{format(day, 'EEE')[0]}</div>
                  <div className="font-semibold">{format(day, 'd')}</div>
                </div>
              );
            })}
          </div>
          {/* Staff rows */}
          {staff.map(s => (
            <div key={s.id} className="flex border-b border-gray-50 hover:bg-gray-50/50">
              <div className="w-36 shrink-0 border-r border-gray-50 px-3 py-2">
                <p className="text-xs font-medium text-gray-700 truncate">{s.full_name}</p>
              </div>
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const bh = bankHolidayMap.get(dayStr);
                const dayEvents = events.filter(e => {
                  if (e.user_id !== s.id) return false;
                  const start = e.start_datetime.split('T')[0];
                  const end = e.end_datetime.split('T')[0];
                  return dayStr >= start && dayStr <= end;
                });
                const ev = dayEvents[0];
                const colour = ev ? CALENDAR_EVENT_COLOURS[ev.event_type] : bh ? 'bg-purple-100' : '';
                return (
                  <div
                    key={dayStr}
                    title={ev ? (ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type]) : bh ?? ''}
                    className={cn(
                      'flex-1 min-w-[28px] border-r border-gray-50 py-2',
                      colour
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Day view ───────────────────────────────────────────────
  function DayView() {
    const dayStr = format(current, 'yyyy-MM-dd');
    const dayEvents = getEventsForDay(current);
    const bh = bankHolidayMap.get(dayStr);

    return (
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {bh && (
          <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-2 text-sm text-purple-700 font-medium">
            Bank Holiday: {bh}
          </div>
        )}
        {dayEvents.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">Nothing planned for this day</div>
        ) : dayEvents.map(ev => {
          const colour = CALENDAR_EVENT_COLOURS[ev.event_type];
          const user = ev.user as Pick<Profile, 'full_name'> | undefined;
          const customer = ev.customer as {company_name: string} | undefined;
          const location = ev.location as {name: string} | undefined;
          return (
            <div key={ev.id} className={cn('rounded-xl border p-4', colour)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  {isManagerOrAdmin && user && (
                    <p className="text-xs font-semibold mb-1">{user.full_name}</p>
                  )}
                  <p className="font-medium text-sm">{ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type]}</p>
                  {customer && <p className="text-xs mt-0.5">{customer.company_name}</p>}
                  {location && <p className="text-xs">{location.name}</p>}
                  {ev.notes && <p className="text-xs mt-1 opacity-75">{ev.notes}</p>}
                </div>
                <span className="text-xs opacity-60 shrink-0">
                  {ev.all_day ? 'All day' : format(parseISO(ev.start_datetime), 'HH:mm')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const titleFormats: Record<CalView, string> = {
    day: 'EEEE d MMMM yyyy',
    week: "'Week of' d MMM yyyy",
    month: 'MMMM yyyy',
    timeline: "'4 weeks from' d MMM",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap gap-y-2">
        {/* View selector */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {VIEWS.filter(v => v !== 'timeline' || isManagerOrAdmin).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'px-3 py-1.5 font-medium capitalize transition-colors',
                view === v ? 'bg-aas-blue text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-2 py-1 text-xs font-medium text-aas-blue hover:bg-aas-blue-pale rounded"
          >
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        <span className="text-sm font-semibold text-gray-700 flex-1">
          {format(current, titleFormats[view])}
        </span>

        {isManagerOrAdmin && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aas-blue text-white text-xs font-medium hover:bg-aas-blue-dark transition-colors">
            <Plus size={14} />
            Add event
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-50 flex gap-3 overflow-x-auto shrink-0">
        {Object.entries(CALENDAR_EVENT_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1 shrink-0">
            <div className={cn('w-2.5 h-2.5 rounded-sm border', CALENDAR_EVENT_COLOURS[key])} />
            <span className="text-[10px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {view === 'month' && <MonthView />}
          {view === 'week' && <WeekView />}
          {view === 'day' && <DayView />}
          {view === 'timeline' && <TimelineView />}
        </>
      )}
    </div>
  );
}
