'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, Pencil } from 'lucide-react';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface Props {
  userId: string;
  pattern: { id?: string; mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean; weekly_hours: number } | null;
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export function WorkingPatternEditor({ userId, pattern }: Props) {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<Record<DayKey, boolean>>({
    mon: pattern?.mon ?? true,
    tue: pattern?.tue ?? true,
    wed: pattern?.wed ?? true,
    thu: pattern?.thu ?? true,
    fri: pattern?.fri ?? true,
    sat: pattern?.sat ?? false,
    sun: pattern?.sun ?? false,
  });
  const [weeklyHours, setWeeklyHours] = useState(pattern?.weekly_hours ?? 40);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const patternData = { user_id: userId, is_current: true, ...days, weekly_hours: weeklyHours };
    if (pattern?.id) {
      await supabase.from('working_patterns').update(patternData).eq('id', pattern.id);
    } else {
      await supabase.from('working_patterns').insert(patternData);
    }
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const workingDayCount = DAYS.filter(d => days[d.key]).length;

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map(({ key, label }) => (
              <span
                key={key}
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  days[key] ? 'bg-aas-blue text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-aas-blue hover:underline shrink-0 ml-3"
          >
            <Pencil size={12} />
            Edit
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {weeklyHours}h per week · {workingDayCount} day{workingDayCount !== 1 ? 's' : ''}
          {saved && <span className="text-green-600 ml-2">✓ Saved</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {DAYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDays(prev => ({ ...prev, [key]: !prev[key] }))}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              days[key]
                ? 'bg-aas-blue text-white border-aas-blue'
                : 'bg-white text-gray-400 border-gray-200 hover:border-aas-blue hover:text-aas-blue'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 shrink-0">Hours per week</label>
        <input
          type="number"
          min={1}
          max={80}
          value={weeklyHours}
          onChange={e => setWeeklyHours(Number(e.target.value))}
          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-aas-blue text-white rounded-lg text-xs font-medium disabled:opacity-60"
        >
          <Check size={13} />
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
