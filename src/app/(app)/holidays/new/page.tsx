'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, differenceInCalendarDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { getLeaveYear } from '@/lib/utils';

export default function NewHolidayPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  async function calculateDays(start: string, end: string) {
    if (!start || !end || end < start) { setCalculatedDays(null); return; }
    setCalculating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.rpc('calculate_working_days', {
      p_user_id: user.id,
      p_start: start,
      p_end: end,
    });
    setCalculatedDays(data ?? 0);
    setCalculating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError('Please select start and end dates.'); return; }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    if (!calculatedDays) { setError('No working days in selected range.'); return; }

    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: err } = await supabase.from('holidays').insert({
      user_id: user.id,
      entered_by: user.id,
      start_date: startDate,
      end_date: endDate,
      working_days: calculatedDays,
      notes: notes || null,
      status: 'pending',
      leave_year: getLeaveYear(new Date(startDate)),
    });

    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/holidays');
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-5">Request holiday</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First day of leave</label>
          <input
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value);
              if (endDate) calculateDays(e.target.value, endDate);
            }}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last day of leave</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => {
              setEndDate(e.target.value);
              calculateDays(startDate, e.target.value);
            }}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
        </div>

        {calculatedDays !== null && (
          <div className="rounded-lg bg-aas-blue-pale border border-aas-blue/20 px-4 py-3 text-sm text-aas-blue font-medium">
            {calculating ? 'Calculating…' : `${calculatedDays} working ${calculatedDays === 1 ? 'day' : 'days'} — bank holidays and non-working days excluded`}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional information for your manager"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !calculatedDays}
            className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}
