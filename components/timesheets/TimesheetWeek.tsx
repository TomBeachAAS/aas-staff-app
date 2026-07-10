'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
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
}

export function TimesheetWeek({ periodId, userId, currentUserId, days, entries, workingPattern, weekStartStr, prevWeek, nextWeek, isLocked, canEdit }: Props) {
  const router = useRouter();
  const [localEntries, setLocalEntries] = useState<Record<string, { start_time: string; end_time: string; notes: string }>>(() => {
    const map: Record<string, { start_time: string; end_time: string; notes: string }> = {};
    entries.forEach(e => {
      map[e.work_date] = {
        start_time: e.start_time.slice(0, 5),
        end_time: e.end_time.slice(0, 5),
        notes: e.notes ?? '',
      };
    });
    return map;
  });
  const [saving, setSaving] = useState<string | null>(null);

  const dayKeys: Record<number, keyof WorkingPattern> = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' };

  function isWorkingDay(dateStr: string) {
    const dow = parseISO(dateStr).getDay();
    if (!workingPattern) return dow >= 1 && dow <= 5;
    return workingPattern[dayKeys[dow]] as boolean;
  }

  function calcHours(start: string, end: string): string {
    if (!start || !end) return '—';
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '—';
    return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
  }

  function totalWeekHours(): string {
    let total = 0;
    Object.values(localEntries).forEach(({ start_time, end_time }) => {
      if (start_time && end_time) {
        const [sh, sm] = start_time.split(':').map(Number);
        const [eh, em] = end_time.split(':').map(Number);
        const mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins > 0) total += mins;
      }
    });
    return `${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60}m` : ''}`;
  }

  async function saveEntry(dateStr: string) {
    if (!periodId || !canEdit) return;
    setSaving(dateStr);
    const supabase = createClient();
    const entry = localEntries[dateStr];
    const existing = entries.find(e => e.work_date === dateStr);

    if (existing) {
      await supabase.from('timesheet_entries').update({
        start_time: entry.start_time,
        end_time: entry.end_time,
        notes: entry.notes || null,
        is_auto_populated: false,
        edited_by: currentUserId,
        edited_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('timesheet_entries').insert({
        period_id: periodId,
        user_id: userId,
        work_date: dateStr,
        start_time: entry?.start_time ?? '08:00',
        end_time: entry?.end_time ?? '17:00',
        notes: entry?.notes || null,
        is_auto_populated: false,
        edited_by: currentUserId,
        edited_at: new Date().toISOString(),
      });
    }
    setSaving(null);
  }

  function updateEntry(dateStr: string, field: 'start_time' | 'end_time' | 'notes', value: string) {
    setLocalEntries(prev => ({
      ...prev,
      [dateStr]: {
        start_time: prev[dateStr]?.start_time ?? '08:00',
        end_time: prev[dateStr]?.end_time ?? '17:00',
        notes: prev[dateStr]?.notes ?? '',
        [field]: value,
      },
    }));
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
        <button onClick={() => router.push(`/timesheets?week=${prevWeek}&user=${userId}`)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-800">
            {format(parseISO(weekStartStr), 'd MMM')} – {format(parseISO(days[6]), 'd MMM yyyy')}
          </p>
          <p className="text-xs text-gray-400">{totalWeekHours()} total</p>
        </div>
        <button onClick={() => router.push(`/timesheets?week=${nextWeek}&user=${userId}`)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronRight size={16} />
        </button>
      </div>

      {isLocked && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-sm text-amber-700">
          <Lock size={14} />
          This timesheet period is locked
        </div>
      )}

      {/* Day entries */}
      <div className="space-y-2">
        {days.map(dateStr => {
          const working = isWorkingDay(dateStr);
          const entry = localEntries[dateStr];
          const dow = format(parseISO(dateStr), 'EEE');
          const dayNum = format(parseISO(dateStr), 'd MMM');
          const hours = entry ? calcHours(entry.start_time, entry.end_time) : '—';

          return (
            <div key={dateStr} className={`bg-white rounded-xl border border-gray-100 p-3 ${!working ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-700">{dow}</span>
                  <span className="text-xs text-gray-400 ml-2">{dayNum}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-aas-blue">{hours}</span>
                  {canEdit && working && (
                    <button
                      onClick={() => saveEntry(dateStr)}
                      disabled={saving === dateStr}
                      className="text-xs px-2 py-1 bg-aas-blue text-white rounded-md disabled:opacity-50"
                    >
                      {saving === dateStr ? '…' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
              {working && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400">Start</label>
                    <input
                      type="time"
                      value={entry?.start_time ?? '08:00'}
                      onChange={e => updateEntry(dateStr, 'start_time', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Finish</label>
                    <input
                      type="time"
                      value={entry?.end_time ?? '17:00'}
                      onChange={e => updateEntry(dateStr, 'end_time', e.target.value)}
                      disabled={!canEdit}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:bg-gray-50"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
