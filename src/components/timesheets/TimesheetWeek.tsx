'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock, Check, Plus, AlertCircle, Send, ThumbsUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TimesheetEntry, WorkingPattern } from '@/types/database';

interface Props {
  periodId: string;
  userId: string;
  currentUserId: string;
  days: string[];
  entries: TimesheetEntry[];
  workingPattern: WorkingPattern | null;
  weekStartStr: string;
  prevWeek: string;
  nextWeek: string;
  isLocked: boolean;
  canEdit: boolean;
  isManagerView: boolean;
  weekLabel: string;
}

const DAY_KEY_MAP: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const LUNCH_BREAK_MINS = 60;

export function TimesheetWeek({
  periodId, userId, currentUserId, days, entries,
  workingPattern, weekStartStr, prevWeek, nextWeek, isLocked, canEdit,
  isManagerView, weekLabel,
}: Props) {
  const router = useRouter();

  const [localEntries, setLocalEntries] = useState<Record<string, { start_time: string; end_time: string; notes: string }>>(() => {
    const map: Record<string, { start_time: string; end_time: string; notes: string }> = {};
    entries.forEach(e => {
      map[e.work_date] = {
        start_time: (e.start_time ?? '').slice(0, 5),
        end_time: (e.end_time ?? '').slice(0, 5),
        notes: (e as any).notes ?? '',
      };
    });
    return map;
  });

  const entryIds = useRef<Record<string, string>>(
    Object.fromEntries(entries.map(e => [e.work_date, (e as any).id]))
  );

  const [autoDays, setAutoDays] = useState<Set<string>>(() => {
    const set = new Set<string>();
    entries.forEach(e => { if ((e as any).is_auto_populated) set.add(e.work_date); });
    return set;
  });

  const [dirtyDays, setDirtyDays] = useState<Set<string>>(new Set());
  const [savedDays, setSavedDays] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [locked, setLocked] = useState(isLocked);
  const [locking, setLocking] = useState(false);

  const [expandedOffDays, setExpandedOffDays] = useState<Set<string>>(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      const dow = parseISO(e.work_date).getDay();
      const isWorking = workingPattern
        ? !!(workingPattern as any)[DAY_KEY_MAP[dow]]
        : dow >= 1 && dow <= 5;
      if (!isWorking) set.add(e.work_date);
    });
    return set;
  });

  function isWorkingDay(dateStr: string): boolean {
    const dow = parseISO(dateStr).getDay();
    if (!workingPattern) return dow >= 1 && dow <= 5;
    return !!(workingPattern as any)[DAY_KEY_MAP[dow]];
  }

  function grossMins(start: string, end: string): number {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function netMins(start: string, end: string): number {
    const g = grossMins(start, end);
    if (g <= 0) return 0;
    return Math.max(0, g - LUNCH_BREAK_MINS);
  }

  function fmtMins(mins: number): string {
    if (mins <= 0) return '—';
    return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  }

  function totalWeekHours(): string {
    let total = 0;
    days.forEach(dateStr => {
      const entry = localEntries[dateStr];
      const working = isWorkingDay(dateStr);
      const start = entry?.start_time ?? (working ? '08:00' : '');
      const end = entry?.end_time ?? (working ? '17:00' : '');
      const m = netMins(start, end);
      if (m > 0) total += m;
    });
    if (total === 0) return '0h';
    return fmtMins(total);
  }

  function updateEntry(dateStr: string, field: 'start_time' | 'end_time' | 'notes', value: string) {
    const working = isWorkingDay(dateStr);
    setLocalEntries(prev => {
      const existing = prev[dateStr];
      return {
        ...prev,
        [dateStr]: {
          start_time: existing?.start_time ?? (working ? '08:00' : ''),
          end_time: existing?.end_time ?? (working ? '17:00' : ''),
          notes: existing?.notes ?? '',
          [field]: value,
        },
      };
    });
    setDirtyDays(prev => new Set([...prev, dateStr]));
    setSavedDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
  }

  async function saveEntry(dateStr: string) {
    if (!periodId || !canEdit) return;
    const entry = localEntries[dateStr];
    if (!entry?.start_time || !entry?.end_time) return;
    if (grossMins(entry.start_time, entry.end_time) <= 0) return;

    setSaving(dateStr);
    const supabase = createClient();
    const existingId = entryIds.current[dateStr];

    if (existingId) {
      await supabase.from('timesheet_entries').update({
        start_time: entry.start_time,
        end_time: entry.end_time,
        notes: entry.notes || null,
        is_auto_populated: false,
      }).eq('id', existingId);
    } else {
      const { data: newEntry } = await supabase
        .from('timesheet_entries')
        .insert({
          period_id: periodId,
          user_id: userId,
          work_date: dateStr,
          start_time: entry.start_time,
          end_time: entry.end_time,
          notes: entry.notes || null,
          is_auto_populated: false,
        })
        .select('id')
        .single();
      if (newEntry) entryIds.current[dateStr] = (newEntry as any).id;
    }

    setAutoDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    setDirtyDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    setSavedDays(prev => new Set([...prev, dateStr]));
    setSaving(null);

    setTimeout(() => {
      setSavedDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; });
    }, 2500);
  }

  async function confirmAll() {
    if (!periodId || !canEdit) return;
    setConfirmingAll(true);
    const supabase = createClient();
    await supabase
      .from('timesheet_entries')
      .update({ is_auto_populated: false })
      .eq('period_id', periodId)
      .eq('is_auto_populated', true);
    setAutoDays(new Set());
    setConfirmingAll(false);
  }

  async function lockPeriod(type: 'submit' | 'approve') {
    if (!periodId) return;
    setLocking(true);
    const supabase = createClient();

    await supabase
      .from('timesheet_periods')
      .update({ is_locked: true })
      .eq('id', periodId);

    await supabase.from('notifications').insert({
      user_id: userId,
      title: type === 'approve' ? 'Timesheet approved' : 'Timesheet submitted',
      body: type === 'approve'
        ? `Your timesheet for ${weekLabel} has been approved by your manager.`
        : `You submitted your timesheet for ${weekLabel}. Your manager will review it.`,
      link: `/timesheets?week=${weekStartStr}`,
      read: false,
    });

    setLocked(true);
    setLocking(false);
  }

  const pendingAutoCount = [...autoDays].filter(d => !dirtyDays.has(d)).length;
  const hasDirtyDays = dirtyDays.size > 0;
  const canSubmit = !locked && !isManagerView && !hasDirtyDays && !!periodId;
  const canApprove = !locked && isManagerView && !!periodId;

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
        <button
          onClick={() => router.push(`/timesheets?week=${prevWeek}&user=${userId}`)}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">{weekLabel}</p>
          <p className="text-xs text-gray-400">{totalWeekHours()} total</p>
        </div>
        <button
          onClick={() => router.push(`/timesheets?week=${nextWeek}&user=${userId}`)}
          className="p-1.5 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Locked / approved banner */}
      {locked && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm text-green-700">
          <Check size={14} />
          {isManagerView
            ? 'This timesheet has been approved.'
            : 'Timesheet submitted — your manager will review it.'}
        </div>
      )}

      {/* Submit / Approve button — shown above days so it's always visible */}
      {canSubmit && (
        <button
          onClick={() => lockPeriod('submit')}
          disabled={locking}
          className="w-full flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          <Send size={15} />
          {locking ? 'Submitting…' : 'Submit this week'}
        </button>
      )}
      {canApprove && (
        <button
          onClick={() => lockPeriod('approve')}
          disabled={locking}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          <ThumbsUp size={15} />
          {locking ? 'Approving…' : 'Approve this timesheet'}
        </button>
      )}

      {/* Confirm all banner */}
      {!locked && canEdit && pendingAutoCount > 1 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
          <p className="text-sm text-blue-700">
            {pendingAutoCount} days auto-filled — do the hours look right?
          </p>
          <button
            onClick={confirmAll}
            disabled={confirmingAll}
            className="text-xs px-3 py-1.5 bg-aas-blue text-white rounded-lg font-medium disabled:opacity-60 whitespace-nowrap ml-3"
          >
            {confirmingAll ? '…' : 'Confirm all'}
          </button>
        </div>
      )}

      {/* Unsaved warning */}
      {!locked && hasDirtyDays && !isManagerView && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          Save all days before submitting.
        </div>
      )}

      {/* Lunch note */}
      <p className="text-xs text-gray-400 text-center">
        Hours shown are net of 1-hour automatic lunch break
      </p>

      {/* Day rows */}
      <div className="space-y-2">
        {days.map(dateStr => {
          const working = isWorkingDay(dateStr);
          const entry = localEntries[dateStr];
          const isAuto = autoDays.has(dateStr) && !dirtyDays.has(dateStr);
          const isDirty = dirtyDays.has(dateStr);
          const isSaved = savedDays.has(dateStr);
          const isExpanded = working || expandedOffDays.has(dateStr);
          const dow = format(parseISO(dateStr), 'EEE');
          const dayNum = format(parseISO(dateStr), 'd MMM');
          const startVal = entry?.start_time ?? (working ? '08:00' : '');
          const endVal = entry?.end_time ?? (working ? '17:00' : '');
          const gross = grossMins(startVal, endVal);
          const timeInvalid = !!(startVal && endVal && gross <= 0);
          const hours = fmtMins(netMins(startVal, endVal));

          if (!isExpanded) {
            return (
              <div key={dateStr} className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-400">{dow}</span>
                  <span className="text-xs text-gray-300">{dayNum}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-medium">off</span>
                </div>
                {canEdit && !locked && (
                  <button
                    onClick={() => setExpandedOffDays(prev => new Set([...prev, dateStr]))}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-aas-blue transition-colors py-1 px-2 rounded-lg hover:bg-blue-50"
                  >
                    <Plus size={12} /> Add hours
                  </button>
                )}
              </div>
            );
          }

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-xl border p-3 transition-colors ${
                timeInvalid ? 'border-red-200 bg-red-50' : isDirty ? 'border-amber-300' : 'border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{dow}</span>
                  <span className="text-xs text-gray-400">{dayNum}</span>
                  {!working && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">extra</span>}
                  {working && isAuto && !isDirty && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium">auto</span>}
                  {isDirty && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">edited</span>}
                </div>
                <div className="flex items-center gap-2">
                  {timeInvalid ? (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                      <AlertCircle size={12} /> Check times
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-aas-blue">{hours}</span>
                  )}
                  {canEdit && !locked && (
                    isSaved ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <Check size={12} /> Saved
                      </span>
                    ) : isDirty && !timeInvalid ? (
                      <button
                        onClick={() => saveEntry(dateStr)}
                        disabled={saving === dateStr}
                        className="text-xs px-2.5 py-1 bg-aas-blue text-white rounded-md disabled:opacity-50"
                      >
                        {saving === dateStr ? '…' : 'Save'}
                      </button>
                    ) : working && isAuto && !isDirty ? (
                      <button
                        onClick={() => saveEntry(dateStr)}
                        disabled={saving === dateStr}
                        className="text-xs px-2.5 py-1 border border-gray-300 text-gray-500 rounded-md hover:border-aas-blue hover:text-aas-blue disabled:opacity-50 transition-colors"
                      >
                        {saving === dateStr ? '…' : 'Confirm'}
                      </button>
                    ) : null
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">Start</label>
                  <input
                    type="time"
                    value={startVal}
                    onChange={e => updateEntry(dateStr, 'start_time', e.target.value)}
                    disabled={!canEdit || locked}
                    className={`w-full px-2 py-1.5 border rounded-lg text-sm bg-white disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-aas-blue ${
                      timeInvalid ? 'border-red-300' : isDirty ? 'border-amber-300' : 'border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Finish</label>
                  <input
                    type="time"
                    value={endVal}
                    onChange={e => updateEntry(dateStr, 'end_time', e.target.value)}
                    disabled={!canEdit || locked}
                    className={`w-full px-2 py-1.5 border rounded-lg text-sm bg-white disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-aas-blue ${
                      timeInvalid ? 'border-red-300' : isDirty ? 'border-amber-300' : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>

              {canEdit && !locked && (isDirty || entry?.notes) && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={entry?.notes ?? ''}
                    onChange={e => updateEntry(dateStr, 'notes', e.target.value)}
                    placeholder="Add a note — e.g. on-call, overtime, different site…"
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-aas-blue"
                  />
                </div>
              )}

              {!working && !entry && !isDirty && !locked && (
                <button
                  onClick={() => setExpandedOffDays(prev => { const n = new Set(prev); n.delete(dateStr); return n; })}
                  className="mt-2 text-xs text-gray-300 hover:text-gray-500 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button — repeated at bottom for convenience */}
      {canSubmit && (
        <button
          onClick={() => lockPeriod('submit')}
          disabled={locking}
          className="w-full flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          <Send size={15} />
          {locking ? 'Submitting…' : 'Submit this week'}
        </button>
      )}
      {canApprove && (
        <button
          onClick={() => lockPeriod('approve')}
          disabled={locking}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium text-sm disabled:opacity-60"
        >
          <ThumbsUp size={15} />
          {locking ? 'Approving…' : 'Approve this timesheet'}
        </button>
      )}
    </div>
  );
}
