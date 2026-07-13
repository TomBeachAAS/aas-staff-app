import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function esc(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function toICSDateTime(ts: string): string {
  return new Date(ts).toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function toICSDate(d: string): string {
  return d.replace(/-/g, '');
}

function nextDay(d: string): string {
  const date = new Date(d + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

const STAMP = toICSDateTime(new Date().toISOString());

function vevent({
  uid, summary, start, end, description, allDay = false,
}: {
  uid: string; summary: string; start: string; end: string;
  description?: string; allDay?: boolean;
}): string {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}@aas-staff-app`,
    `DTSTAMP:${STAMP}`,
    allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
    allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
    `SUMMARY:${esc(summary)}`,
    'STATUS:CONFIRMED',
  ];
  if (description) lines.push(`DESCRIPTION:${esc(description)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token) return new NextResponse('Not found', { status: 404 });

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('calendar_token', token)
    .single();

  if (!profile) return new NextResponse('Not found', { status: 404 });

  const userId = profile.id;

  const [
    { data: events },
    { data: tasks },
    { data: holidays },
    { data: sickness },
    { data: bankHolidays },
  ] = await Promise.all([
    supabase
      .from('calendar_events')
      .select('id, title, event_type, start_datetime, end_datetime, description')
      .eq('user_id', userId),
    supabase
      .from('tasks')
      .select('id, title, task_date, start_time, priority, description')
      .eq('created_by', userId)
      .not('status', 'in', '("completed","cancelled")')
      .not('task_date', 'is', null),
    supabase
      .from('holidays')
      .select('id, start_date, end_date, holiday_type')
      .eq('user_id', userId)
      .eq('status', 'approved'),
    supabase
      .from('sickness_records')
      .select('id, start_date, end_date')
      .eq('user_id', userId),
    supabase
      .from('bank_holidays')
      .select('id, date, name')
      .order('date'),
  ]);

  const vevents: string[] = [];

  for (const ev of events ?? []) {
    vevents.push(vevent({
      uid: `event-${ev.id}`,
      summary: ev.title ?? (ev.event_type as string)?.replace(/_/g, ' ') ?? 'Event',
      start: toICSDateTime(ev.start_datetime),
      end: toICSDateTime(ev.end_datetime),
      description: ev.description ?? undefined,
    }));
  }

  for (const task of tasks ?? []) {
    const prefix = task.priority === 'urgent' ? '⚠️ ' : task.priority === 'high' ? '🔴 ' : '';
    const summary = `Task: ${prefix}${task.title}`;
    if (task.start_time) {
      const startIso = `${task.task_date}T${task.start_time}`;
      const endDate = new Date(startIso);
      endDate.setHours(endDate.getHours() + 1);
      vevents.push(vevent({ uid: `task-${task.id}`, summary, start: toICSDateTime(startIso), end: toICSDateTime(endDate.toISOString()) }));
    } else {
      vevents.push(vevent({ uid: `task-${task.id}`, summary, start: toICSDate(task.task_date), end: nextDay(task.task_date), allDay: true }));
    }
  }

  for (const h of holidays ?? []) {
    const label = (h.holiday_type as string) === 'unpaid' ? 'Unpaid Leave' : 'Holiday';
    vevents.push(vevent({ uid: `holiday-${h.id}`, summary: `🌴 ${label}`, start: toICSDate(h.start_date), end: nextDay(h.end_date), allDay: true }));
  }

  for (const s of sickness ?? []) {
    vevents.push(vevent({ uid: `sickness-${s.id}`, summary: '🤒 Sick leave', start: toICSDate(s.start_date), end: s.end_date ? nextDay(s.end_date) : nextDay(s.start_date), allDay: true }));
  }

  for (const bh of bankHolidays ?? []) {
    vevents.push(vevent({ uid: `bh-${bh.id}`, summary: `🇬🇧 ${bh.name}`, start: toICSDate(bh.date), end: nextDay(bh.date), allDay: true }));
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Autonomous Agri Solutions//Staff App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:AAS Work — ${profile.full_name}`,
    'X-WR-TIMEZONE:Europe/London',
    'X-PUBLISHED-TTL:PT1H',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="aas-calendar.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
