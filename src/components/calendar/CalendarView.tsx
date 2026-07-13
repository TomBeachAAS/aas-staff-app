'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, addWeeks, subMonths, subWeeks,
  isSameMonth, isToday, parseISO, eachDayOfInterval
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CALENDAR_EVENT_COLOURS, CALENDAR_EVENT_LABELS, cn } from '@/lib/utils';
import type { CalendarEvent, BankHoliday, Profile } from '@/types/database';

const VIEWS = ['day', 'week', 'month', 'timeline'] as const;
type CalView = typeof VIEWS[number];
type Visibility = 'all' | 'personal' | 'custom';

interface Props {
  currentUserId: string;
  profile: Profile;
  initialView: CalView;
  initialDate: string;
  allStaff: Pick<Profile, 'id' | 'full_name' | 'role'>[] | null;
  bankHolidays: BankHoliday[];
}

const MODAL_EVENT_TYPES = [
  { value: 'task',          label: 'Task',          pill: 'bg-aas-blue text-white border-aas-blue' },
  { value: 'holiday',       label: 'Annual Leave',  pill: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'sickness',      label: 'Sickness',      pill: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'customer_visit',label: 'Customer Visit',pill: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'meeting',       label: 'Meeting',       pill: 'bg-violet-100 text-violet-800 border-violet-200' },
  { value: 'training',      label: 'Training',      pill: 'bg-pink-100 text-pink-800 border-pink-200' },
  { value: 'farm_work',     label: 'Farm Work',     pill: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'site_work',     label: 'Site Work',     pill: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'travel',        label: 'Travel',        pill: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { value: 'office',        label: 'Office',        pill: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'home_working',  label: 'Home Working',  pill: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'general_work',  label: 'General',       pill: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export function CalendarView({ currentUserId, profile, initialView, initialDate, allStaff, bankHolidays }: Props) {
  const router = useRouter();
  const [view, setView] = useState<CalView>(initialView);
  const [current, setCurrent] = useState(() => parseISO(initialDate));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [sickness, setSickness] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);

  // Day panel
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [dayPanelDate, setDayPanelDate] = useState<string | null>(null);

  // Modal (create + edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [modalDate, setModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventType, setEventType] = useState('general_work');
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [endDate, setEndDate] = useState('');
  const [targetUserId, setTargetUserId] = useState(currentUserId);
  const [notes, setNotes] = useState('');
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let start: Date, end: Date;
    if (view === 'day') { start = current; end = current; }
    else if (view === 'week') { start = startOfWeek(current, { weekStartsOn: 1 }); end = endOfWeek(current, { weekStartsOn: 1 }); }
    else if (view === 'month') { start = startOfWeek(startOfMonth(current), { weekStartsOn: 1 }); end = endOfWeek(endOfMonth(current), { weekStartsOn: 1 }); }
    else { start = startOfWeek(current, { weekStartsOn: 1 }); end = addDays(start, 27); }
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const rangeStart = startStr + 'T00:00:00';
    const rangeEnd = endStr + 'T23:59:59';

    // Fetch all events — visibility filtering happens below for staff
    const eventsQuery = supabase
      .from('calendar_events')
      .select('*, customer:customers(company_name), location:locations(name), visibility, visible_to')
      .lte('start_datetime', rangeEnd)
      .gte('end_datetime', rangeStart)
      .order('start_datetime');

    const tasksQuery = supabase
      .from('tasks')
      .select('id, title, task_date, status, priority, customer:customers(company_name)')
      .gte('task_date', startStr)
      .lte('task_date', endStr)
      .not('status', 'eq', 'cancelled')
      .order('task_date');
    const holidaysQuery = supabase
      .from('holidays')
      .select('id, user_id, start_date, end_date')
      .eq('status', 'approved')
      .gte('end_date', startStr)
      .lte('start_date', endStr);
    const completedJobsQuery = supabase
      .from('job_board')
      .select('id, title, completed_by, completed_at, completion_notes')
      .eq('status', 'completed')
      .gte('completed_at', rangeStart)
      .lte('completed_at', rangeEnd);
    let sicknessQuery = supabase
      .from('sickness_records')
      .select('id, user_id, start_date, end_date')
      .lte('start_date', endStr)
      .or('end_date.is.null,end_date.gte.' + startStr);
    if (!isManagerOrAdmin) sicknessQuery = sicknessQuery.eq('user_id', currentUserId);

    const [
      { data: eventsData, error: eventsError },
      { data: tasksData },
      { data: holidaysData },
      { data: completedJobsData },
      { data: sicknessData },
    ] = await Promise.all([eventsQuery, tasksQuery, holidaysQuery, completedJobsQuery, sicknessQuery]);

    if (eventsError) console.error('calendar_events query failed:', eventsError);

    // Apply visibility filter for non-managers
    let filteredEvents = (eventsData as any[]) ?? [];
    if (!isManagerOrAdmin) {
      filteredEvents = filteredEvents.filter(ev => {
        const vis: Visibility = ev.visibility ?? 'all';
        if (vis === 'all') return true;
        if (vis === 'personal') return ev.user_id === currentUserId;
        if (vis === 'custom') {
          const vt = ev.visible_to as string[] | null;
          return ev.user_id === currentUserId || (vt?.includes(currentUserId) ?? false);
        }
        return true;
      });
    }

    setEvents(filteredEvents as CalendarEvent[]);
    setTasks(tasksData ?? []);
    setHolidays(holidaysData ?? []);
    setCompletedJobs(completedJobsData ?? []);
    setSickness(sicknessData ?? []);
    setLoading(false);
  }, [view, current, currentUserId, isManagerOrAdmin]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    if (!modalOpen) return;
    const supabase = createClient();
    Promise.all([
      supabase.from('customers').select('id, company_name').eq('is_active', true).order('company_name'),
      supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
    ]).then(([{ data: c }, { data: l }]) => {
      setCustomers(c ?? []);
      setLocations(l ?? []);
    });
  }, [modalOpen]);

  function openDayPanel(dateStr: string) {
    setDayPanelDate(dateStr);
    setDayPanelOpen(true);
  }

  function openModal(dateStr: string) {
    setEditingEvent(null);
    setModalDate(dateStr);
    setEndDate(dateStr);
    setEventType('general_work');
    setTitle('');
    setAllDay(true);
    setStartTime('09:00');
    setEndTime('17:00');
    setTargetUserId(currentUserId);
    setNotes('');
    setCustomerId('');
    setLocationId('');
    setVisibility('all');
    setVisibleTo([]);
    setModalError('');
    setModalOpen(true);
  }

  function openEditModal(ev: CalendarEvent) {
    setEditingEvent(ev);
    setEventType(ev.event_type);
    setTitle(ev.title ?? '');
    setAllDay(ev.all_day);
    setModalDate(ev.start_datetime.split('T')[0]);
    setEndDate(ev.end_datetime.split('T')[0]);
    setStartTime(ev.all_day ? '09:00' : ev.start_datetime.split('T')[1]?.slice(0, 5) ?? '09:00');
    setEndTime(ev.all_day ? '17:00' : ev.end_datetime.split('T')[1]?.slice(0, 5) ?? '17:00');
    setTargetUserId(ev.user_id);
    setNotes(ev.notes ?? '');
    setCustomerId((ev as any).customer_id ?? '');
    setLocationId((ev as any).location_id ?? '');
    setVisibility((ev as any).visibility ?? 'all');
    setVisibleTo((ev as any).visible_to ?? []);
    setModalError('');
    setModalOpen(true);
  }

  // Owner can always edit; managers can edit anyone's; staff can only edit their own
  function canEdit(ev: CalendarEvent) {
    return isManagerOrAdmin || ev.user_id === currentUserId;
  }

  async function handleSave() {
    setModalError('');
    if (eventType === 'task') { setModalOpen(false); router.push('/tasks/new?date=' + modalDate); return; }
    if (eventType === 'holiday') { setModalOpen(false); router.push('/holidays/new?start=' + modalDate + '&end=' + (endDate || modalDate)); return; }
    if (eventType === 'sickness') { setModalOpen(false); router.push('/sickness'); return; }
    setSaving(true);
    const supabase = createClient();
    const startDatetime = allDay ? (modalDate + 'T00:00:00') : (modalDate + 'T' + startTime + ':00');
    const endDatetime = allDay ? ((endDate || modalDate) + 'T23:59:59') : (modalDate + 'T' + endTime + ':00');
    const payload = {
      user_id: targetUserId,
      event_type: eventType as any,
      title: title || null,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      all_day: allDay,
      customer_id: customerId || null,
      location_id: locationId || null,
      notes: notes || null,
      visibility,
      visible_to: visibility === 'custom' ? visibleTo : null,
    };
    let error;
    if (editingEvent) {
      ({ error } = await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id));
    } else {
      ({ error } = await supabase.from('calendar_events').insert({ ...payload, created_by: currentUserId }));
    }
    setSaving(false);
    if (error) { setModalError(error.message); return; }
    setModalOpen(false);
    loadEvents();
  }

  async function handleDelete() {
    if (!editingEvent) return;
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('calendar_events').delete().eq('id', editingEvent.id);
    setDeleting(false);
    if (error) { setModalError(error.message); return; }
    setModalOpen(false);
    loadEvents();
  }

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
      const s = e.start_datetime.split('T')[0];
      const en = e.end_datetime.split('T')[0];
      return dateStr >= s && dateStr <= en;
    });
  }
  function getTasksForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.filter(t => t.task_date === dateStr);
  }
  function getHolidaysForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.filter(h => dateStr >= h.start_date && dateStr <= h.end_date);
  }
  function getSicknessForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sickness.filter(s => dateStr >= s.start_date && (s.end_date === null || dateStr <= s.end_date));
  }
  function getCompletedJobsForDay(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return completedJobs.filter(j => j.completed_at?.split('T')[0] === dateStr);
  }
  function getStaffName(userId: string) {
    return allStaff?.find(s => s.id === userId)?.full_name ?? 'Staff';
  }

  // ── Chips ──────────────────────────────────────────────────
  function EventChip({ event }: { event: CalendarEvent }) {
    const colour = CALENDAR_EVENT_COLOURS[event.event_type] ?? 'bg-gray-100 text-gray-700';
    const label = event.title ?? CALENDAR_EVENT_LABELS[event.event_type] ?? event.event_type;
    const editable = canEdit(event);
    return (
      <div
        onClick={e => { e.stopPropagation(); if (editable) openEditModal(event); }}
        className={cn('text-xs px-1.5 py-0.5 rounded border truncate', colour, editable && 'cursor-pointer hover:opacity-75')}
        title={editable ? 'Click to edit' : undefined}
      >
        {isManagerOrAdmin ? (getStaffName(event.user_id).split(' ')[0] + ': ') : ''}{label}
      </div>
    );
  }
  function HolidayChip({ holiday }: { holiday: any }) {
    const firstName = getStaffName(holiday.user_id).split(' ')[0];
    return (
      <div className="text-xs px-1.5 py-0.5 rounded border truncate bg-green-100 text-green-800 border-green-200">
        {firstName}: Leave
      </div>
    );
  }
  function SicknessChip({ record }: { record: any }) {
    const firstName = getStaffName(record.user_id).split(' ')[0];
    return (
      <div className="text-xs px-1.5 py-0.5 rounded border truncate bg-red-100 text-red-800 border-red-200">
        {firstName}: Sick
      </div>
    );
  }
  function TaskChip({ task }: { task: any }) {
    const isDone = task.status === 'completed';
    return (
      <div
        onClick={(e) => { e.stopPropagation(); router.push('/tasks/' + task.id); }}
        className={cn(
          'text-xs px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80',
          isDone ? 'bg-green-100 text-green-800 border-green-200 line-through' : 'bg-aas-blue text-white border-aas-blue'
        )}
      >
        {'✓ ' + task.title}
      </div>
    );
  }
  function CompletedJobChip({ job }: { job: any }) {
    return (
      <div className="text-xs px-1.5 py-0.5 rounded border truncate bg-orange-100 text-orange-800 border-orange-200">
        {'✓ ' + job.title}
      </div>
    );
  }

  // ── Day Detail Panel ───────────────────────────────────────
  function DayDetailPanel() {
    if (!dayPanelDate) return null;
    const day = parseISO(dayPanelDate);
    const dayEvents = getEventsForDay(day);
    const dayTasks = getTasksForDay(day);
    const dayHolidays = getHolidaysForDay(day);
    const daySickness = getSicknessForDay(day);
    const dayCompletedJobs = getCompletedJobsForDay(day);
    const bh = bankHolidayMap.get(dayPanelDate);
    const isEmpty = dayEvents.length === 0 && dayTasks.length === 0 && dayHolidays.length === 0 && daySickness.length === 0 && dayCompletedJobs.length === 0 && !bh;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setDayPanelOpen(false)} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
            <h3 className="text-base font-bold text-gray-800">{format(day, 'EEEE d MMMM')}</h3>
            <button onClick={() => setDayPanelOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {bh && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm text-purple-700 font-medium">
                {'Bank Holiday: ' + bh}
              </div>
            )}
            {dayHolidays.length > 0 && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-3">
                <p className="text-xs font-semibold text-green-700 mb-1.5">On leave</p>
                <div className="flex flex-wrap gap-1.5">
                  {dayHolidays.map(h => (
                    <span key={h.id} className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                      {getStaffName(h.user_id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {daySickness.length > 0 && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-700 mb-1.5">Off sick</p>
                <div className="flex flex-wrap gap-1.5">
                  {daySickness.map(s => (
                    <span key={s.id} className="text-xs bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                      {getStaffName(s.user_id)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {dayTasks.map(task => {
              const isDone = task.status === 'completed';
              const customer = task.customer as { company_name: string } | undefined;
              return (
                <div
                  key={task.id}
                  onClick={() => { setDayPanelOpen(false); router.push('/tasks/' + task.id); }}
                  className={cn('rounded-xl border p-3 cursor-pointer hover:opacity-90 transition-opacity', isDone ? 'bg-green-50 border-green-100' : 'bg-aas-blue border-aas-blue')}
                >
                  <p className={cn('font-medium text-sm', isDone ? 'text-green-800 line-through' : 'text-white')}>{'✓ ' + task.title}</p>
                  {customer && <p className={cn('text-xs mt-0.5', isDone ? 'text-green-600' : 'text-white/80')}>{customer.company_name}</p>}
                </div>
              );
            })}
            {dayEvents.map(ev => {
              const colour = CALENDAR_EVENT_COLOURS[ev.event_type];
              const customer = ev.customer as { company_name: string } | undefined;
              const location = ev.location as { name: string } | undefined;
              const editable = canEdit(ev);
              return (
                <div key={ev.id} className={cn('rounded-xl border p-3', colour)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isManagerOrAdmin && <p className="text-xs font-semibold mb-0.5">{getStaffName(ev.user_id)}</p>}
                      <p className="font-medium text-sm">{ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type]}</p>
                      {customer && <p className="text-xs mt-0.5">{(customer as any).company_name}</p>}
                      {location && <p className="text-xs">{(location as any).name}</p>}
                      {ev.notes && <p className="text-xs mt-1 opacity-75">{ev.notes}</p>}
                      <p className="text-xs opacity-50 mt-1">{ev.all_day ? 'All day' : format(parseISO(ev.start_datetime), 'HH:mm')}</p>
                    </div>
                    {editable && (
                      <button
                        onClick={e => { e.stopPropagation(); setDayPanelOpen(false); openEditModal(ev); }}
                        className="p-1.5 rounded-lg hover:bg-black/10 transition-colors shrink-0"
                        title="Edit event"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {dayCompletedJobs.length > 0 && (
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                <p className="text-xs font-semibold text-orange-700 mb-1.5">Jobs completed</p>
                {dayCompletedJobs.map(j => (
                  <div key={j.id} className="text-sm text-orange-800 py-0.5">
                    {'✓ ' + j.title}
                    <span className="text-xs text-orange-600 ml-1">{'— ' + getStaffName(j.completed_by)}</span>
                    {j.completion_notes && <p className="text-xs text-orange-600 italic mt-0.5">{'"' + j.completion_notes + '"'}</p>}
                  </div>
                ))}
              </div>
            )}
            {isEmpty && <p className="text-sm text-gray-400 text-center py-8">Nothing scheduled for this day</p>}
          </div>
          <div className="p-4 border-t border-gray-100 shrink-0">
            <button
              onClick={() => { setDayPanelOpen(false); openModal(dayPanelDate!); }}
              className="w-full py-2.5 bg-aas-blue text-white rounded-xl text-sm font-medium hover:bg-aas-blue-dark transition-colors"
            >
              + Add event or task
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Month view ─────────────────────────────────────────────
  function MonthView() {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-hidden">
          {days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEvents = getEventsForDay(day);
            const dayTasks = getTasksForDay(day);
            const dayHolidays = getHolidaysForDay(day);
            const daySickness = getSicknessForDay(day);
            const dayCompletedJobs = getCompletedJobsForDay(day);
            const bh = bankHolidayMap.get(dayStr);
            const inMonth = isSameMonth(day, current);
            const totalItems = dayEvents.length + dayTasks.length + dayHolidays.length + daySickness.length + dayCompletedJobs.length;
            return (
              <div
                key={dayStr}
                onClick={() => openDayPanel(dayStr)}
                className={cn(
                  'border-b border-r border-gray-50 p-1 min-h-0 flex flex-col overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors',
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
                {bh && <div className="text-[10px] text-purple-600 font-medium truncate mb-0.5">{bh}</div>}
                <div className="flex-1 overflow-hidden space-y-0.5">
                  {dayHolidays.slice(0, 1).map(h => <HolidayChip key={h.id} holiday={h} />)}
                  {daySickness.slice(0, 1).map(s => <SicknessChip key={s.id} record={s} />)}
                  {dayTasks.slice(0, 1).map(t => <TaskChip key={t.id} task={t} />)}
                  {dayCompletedJobs.slice(0, 1).map(j => <CompletedJobChip key={j.id} job={j} />)}
                  {dayEvents.slice(0, Math.max(0, 2 - dayTasks.length)).map(ev => <EventChip key={ev.id} event={ev} />)}
                  {totalItems > 3 && <div className="text-[10px] text-gray-400">{'+' + (totalItems - 3) + ' more'}</div>}
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
          {days.map(day => {
            const bh = bankHolidayMap.get(format(day, 'yyyy-MM-dd'));
            return (
              <div
                key={day.toISOString()}
                onClick={() => openDayPanel(format(day, 'yyyy-MM-dd'))}
                className={cn('p-2 border-b border-r border-gray-100 text-center cursor-pointer hover:bg-gray-50', isToday(day) && 'bg-aas-blue-50')}
              >
                <p className="text-xs text-gray-400">{format(day, 'EEE')}</p>
                <p className={cn('text-sm font-semibold', isToday(day) ? 'text-aas-blue' : 'text-gray-700')}>{format(day, 'd')}</p>
                {bh && <p className="text-[10px] text-purple-600 truncate">{bh}</p>}
              </div>
            );
          })}
          {days.map(day => {
            const dayEvents = getEventsForDay(day);
            const dayTasks = getTasksForDay(day);
            const dayHolidays = getHolidaysForDay(day);
            const daySickness = getSicknessForDay(day);
            const dayCompletedJobs = getCompletedJobsForDay(day);
            return (
              <div
                key={day.toISOString()}
                onClick={() => openDayPanel(format(day, 'yyyy-MM-dd'))}
                className={cn('p-1.5 border-r border-b border-gray-50 min-h-32 space-y-1 cursor-pointer hover:bg-gray-50/70', isToday(day) && 'bg-aas-blue-50/50')}
              >
                {dayHolidays.map(h => <HolidayChip key={h.id} holiday={h} />)}
                {daySickness.map(s => <SicknessChip key={s.id} record={s} />)}
                {dayTasks.map(t => <TaskChip key={t.id} task={t} />)}
                {dayCompletedJobs.map(j => <CompletedJobChip key={j.id} job={j} />)}
                {dayEvents.map(ev => <EventChip key={ev.id} event={ev} />)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Timeline view ──────────────────────────────────────────
  function TimelineView() {
    const staff = allStaff ?? [];
    const timelineStart = startOfWeek(current, { weekStartsOn: 1 });
    const days = Array.from({ length: 28 }, (_, i) => addDays(timelineStart, i));
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
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
          {staff.map(member => (
            <div key={member.id} className="flex border-b border-gray-50 hover:bg-gray-50/50">
              <div className="w-36 shrink-0 border-r border-gray-50 px-3 py-2">
                <p className="text-xs font-medium text-gray-700 truncate">{member.full_name}</p>
              </div>
              {days.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const bh = bankHolidayMap.get(dayStr);
                const onHoliday = holidays.some(h => h.user_id === member.id && dayStr >= h.start_date && dayStr <= h.end_date);
                const onSick = sickness.some(s => s.user_id === member.id && dayStr >= s.start_date && (s.end_date === null || dayStr <= s.end_date));
                const dayEvents = events.filter(e => {
                  if (e.user_id !== member.id) return false;
                  const es = e.start_datetime.split('T')[0];
                  const ee = e.end_datetime.split('T')[0];
                  return dayStr >= es && dayStr <= ee;
                });
                const ev = dayEvents[0];
                const colour = onHoliday ? 'bg-green-200'
                  : onSick ? 'bg-red-200'
                  : ev ? CALENDAR_EVENT_COLOURS[ev.event_type]
                  : bh ? 'bg-purple-100' : '';
                return (
                  <div
                    key={dayStr}
                    title={onHoliday ? 'Annual Leave' : onSick ? 'Sick' : ev ? (ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type]) : bh ?? ''}
                    className={cn('flex-1 min-w-[28px] border-r border-gray-50 py-2', colour)}
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
    const dayTasks = getTasksForDay(current);
    const dayHolidays = getHolidaysForDay(current);
    const daySickness = getSicknessForDay(current);
    const dayCompletedJobs = getCompletedJobsForDay(current);
    const bh = bankHolidayMap.get(dayStr);
    const hasItems = dayEvents.length > 0 || dayTasks.length > 0 || dayHolidays.length > 0 || daySickness.length > 0 || dayCompletedJobs.length > 0;
    return (
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {bh && (
          <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-2 text-sm text-purple-700 font-medium">
            {'Bank Holiday: ' + bh}
          </div>
        )}
        {dayHolidays.length > 0 && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-3">
            <p className="text-xs font-semibold text-green-700 mb-1.5">On leave today</p>
            <div className="flex flex-wrap gap-1.5">
              {dayHolidays.map(h => (
                <span key={h.id} className="text-xs bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  {getStaffName(h.user_id)}
                </span>
              ))}
            </div>
          </div>
        )}
        {daySickness.length > 0 && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">Off sick today</p>
            <div className="flex flex-wrap gap-1.5">
              {daySickness.map(s => (
                <span key={s.id} className="text-xs bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                  {getStaffName(s.user_id)}
                </span>
              ))}
            </div>
          </div>
        )}
        {dayTasks.map(task => {
          const isDone = task.status === 'completed';
          const customer = task.customer as { company_name: string } | undefined;
          return (
            <div
              key={task.id}
              onClick={() => router.push('/tasks/' + task.id)}
              className={cn('rounded-xl border p-4 cursor-pointer hover:opacity-90 transition-opacity', isDone ? 'bg-green-50 border-green-100' : 'bg-aas-blue border-aas-blue')}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn('font-medium text-sm', isDone ? 'text-green-800 line-through' : 'text-white')}>{'✓ ' + task.title}</p>
                  {customer && <p className={cn('text-xs mt-0.5', isDone ? 'text-green-600' : 'text-white/80')}>{customer.company_name}</p>}
                </div>
                <span className={cn('text-xs shrink-0 px-2 py-0.5 rounded-full font-medium', isDone ? 'bg-green-200 text-green-800' : 'bg-white/20 text-white')}>
                  {isDone ? 'Done' : 'Task'}
                </span>
              </div>
            </div>
          );
        })}
        {dayEvents.map(ev => {
          const colour = CALENDAR_EVENT_COLOURS[ev.event_type];
          const customer = ev.customer as { company_name: string } | undefined;
          const location = ev.location as { name: string } | undefined;
          const editable = canEdit(ev);
          return (
            <div key={ev.id} className={cn('rounded-xl border p-4', colour)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {isManagerOrAdmin && <p className="text-xs font-semibold mb-1">{getStaffName(ev.user_id)}</p>}
                  <p className="font-medium text-sm">{ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type]}</p>
                  {customer && <p className="text-xs mt-0.5">{(customer as any).company_name}</p>}
                  {location && <p className="text-xs">{(location as any).name}</p>}
                  {ev.notes && <p className="text-xs mt-1 opacity-75">{ev.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs opacity-60">
                    {ev.all_day ? 'All day' : format(parseISO(ev.start_datetime), 'HH:mm')}
                  </span>
                  {editable && (
                    <button
                      onClick={() => openEditModal(ev)}
                      className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                      title="Edit event"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {dayCompletedJobs.length > 0 && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
            <p className="text-xs font-semibold text-orange-700 mb-1.5">Jobs completed today</p>
            {dayCompletedJobs.map(j => (
              <div key={j.id} className="py-0.5">
                <p className="text-sm text-orange-800">{'✓ ' + j.title + ' '}<span className="text-xs text-orange-600">{'— ' + getStaffName(j.completed_by)}</span></p>
                {j.completion_notes && <p className="text-xs text-orange-600 italic">{'"' + j.completion_notes + '"'}</p>}
              </div>
            ))}
          </div>
        )}
        {!hasItems ? (
          <div onClick={() => openModal(dayStr)} className="text-center py-12 text-sm text-gray-400 cursor-pointer hover:text-aas-blue border-2 border-dashed border-gray-200 rounded-xl hover:border-aas-blue transition-colors">
            + Tap to add event
          </div>
        ) : (
          <button onClick={() => openModal(dayStr)} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-aas-blue hover:text-aas-blue transition-colors">
            + Add another event
          </button>
        )}
      </div>
    );
  }

  // ── Add / Edit Event Modal ─────────────────────────────────
  function AddEventModal() {
    const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';
    const showCustomerLocation = ['customer_visit', 'farm_work', 'site_work', 'meeting', 'general_work'].includes(eventType);
    const isTaskType = eventType === 'task';
    const isHolidayType = eventType === 'holiday';
    const isSicknessType = eventType === 'sickness';
    const isEditing = !!editingEvent;
    const isRedirectType = isTaskType || isHolidayType || isSicknessType;
    const availableTypes = isEditing
      ? MODAL_EVENT_TYPES.filter(t => !['task', 'holiday', 'sickness'].includes(t.value))
      : MODAL_EVENT_TYPES;

    const visibilityOptions: { value: Visibility; label: string; desc: string }[] = [
      { value: 'all',      label: 'Everyone', desc: 'All staff can see this' },
      { value: 'personal', label: 'Just me',  desc: 'Only you (and managers) can see this' },
      ...(isManagerOrAdmin && allStaff && allStaff.length > 1
        ? [{ value: 'custom' as Visibility, label: 'Custom', desc: 'Choose who can see this' }]
        : []),
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
            <h3 className="text-base font-bold text-gray-800">{isEditing ? 'Edit event' : 'Add event'}</h3>
            <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {modalError && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{modalError}</div>}
            {/* Event type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEventType(t.value)}
                    className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-colors', eventType === t.value ? t.pill : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400')}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {/* For (manager only) */}
            {isManagerOrAdmin && allStaff && allStaff.length > 0 && !isSicknessType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">For</label>
                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} className={inputClass}>
                  {allStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}{s.id === currentUserId ? ' (me)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Title */}
            {!isHolidayType && !isSicknessType && !['office', 'home_working', 'travel'].includes(eventType) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{'Title' + (isTaskType ? ' *' : ' (optional)')}</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder={isTaskType ? 'What needs doing?' : 'Add a title…'} className={inputClass} />
              </div>
            )}
            {/* Dates */}
            {!isSicknessType && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isHolidayType ? 'From' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={e => {
                      setModalDate(e.target.value);
                      if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className={inputClass}
                  />
                </div>
                {!isTaskType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isHolidayType ? 'To' : 'End date'}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      min={modalDate}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            )}
            {/* Time */}
            {!isTaskType && !isHolidayType && !isSicknessType && (
              <>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded" />
                  <span className="text-sm text-gray-700">All day</span>
                </label>
                {!allDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Customer / Location */}
            {showCustomerLocation && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
                    <option value="">{'— none —'}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputClass}>
                    <option value="">{'— none —'}</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            {/* Notes */}
            {!isTaskType && !isHolidayType && !isSicknessType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
              </div>
            )}
            {/* Visibility — hide for redirect types */}
            {!isRedirectType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visible to</label>
                <div className="flex gap-2 flex-wrap">
                  {visibilityOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVisibility(opt.value)}
                      title={opt.desc}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        visibility === opt.value
                          ? 'bg-aas-blue text-white border-aas-blue'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Custom picker */}
                {visibility === 'custom' && allStaff && (
                  <div className="mt-2 border border-gray-200 rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                    {allStaff.filter(s => s.id !== targetUserId).map(s => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={visibleTo.includes(s.id)}
                          onChange={e =>
                            setVisibleTo(prev =>
                              e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                            )
                          }
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">{s.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {visibility === 'personal' && (
                  <p className="text-xs text-gray-400 mt-1">Only you and managers will see this event.</p>
                )}
              </div>
            )}
            {/* Hint banners */}
            {isTaskType && !isEditing && <div className="rounded-lg bg-aas-blue-pale border border-aas-blue/20 px-3 py-2 text-xs text-aas-blue">{"You'll be taken to the task form with the date pre-filled."}</div>}
            {isHolidayType && !isEditing && <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-xs text-green-700">{"You'll be taken to the holiday request form with the dates pre-filled."}</div>}
            {isSicknessType && !isEditing && <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">{"You'll be taken to the sickness page to log the absence."}</div>}
          </div>
          <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
                >
                  <Trash2 size={14} />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60">
                  {saving ? 'Saving…' : isSicknessType ? 'Go to sickness →' : isTaskType ? 'Go to task form →' : isHolidayType ? 'Go to holiday form →' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
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
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {VIEWS.filter(v => v !== 'timeline' || isManagerOrAdmin).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-3 py-1.5 font-medium capitalize transition-colors', view === v ? 'bg-aas-blue text-white' : 'text-gray-600 hover:bg-gray-50')}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrent(new Date())} className="px-2 py-1 text-xs font-medium text-aas-blue hover:bg-aas-blue-pale rounded">Today</button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><ChevronRight size={16} /></button>
        </div>
        <span className="text-sm font-semibold text-gray-700 flex-1">{format(current, titleFormats[view])}</span>
        <button
          onClick={() => openModal(format(current, 'yyyy-MM-dd'))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aas-blue text-white text-xs font-medium hover:bg-aas-blue-dark transition-colors"
        >
          <Plus size={14} />
          Add event
        </button>
      </div>
      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-50 flex gap-3 overflow-x-auto shrink-0">
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm border bg-green-100 border-green-200" />
          <span className="text-[10px] text-gray-500">Leave</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm border bg-red-100 border-red-200" />
          <span className="text-[10px] text-gray-500">Sickness</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm border bg-aas-blue border-aas-blue" />
          <span className="text-[10px] text-gray-500">Task</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="w-2.5 h-2.5 rounded-sm border bg-orange-100 border-orange-200" />
          <span className="text-[10px] text-gray-500">Job done</span>
        </div>
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
          {view === 'month' && MonthView()}
          {view === 'week' && WeekView()}
          {view === 'day' && DayView()}
          {view === 'timeline' && TimelineView()}
        </>
      )}
      {dayPanelOpen && DayDetailPanel()}
      {modalOpen && AddEventModal()}
    </div>
  );
}
