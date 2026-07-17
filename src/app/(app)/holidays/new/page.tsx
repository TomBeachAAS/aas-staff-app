'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getLeaveYear } from '@/lib/utils';

function countWorkingDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  let count = 0;
  const d = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (d <= last) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export default function NewHolidayPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [startDate, setStartDate] = useState(params.get('start') ?? '');
  const [endDate, setEndDate] = useState(params.get('end') ?? '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('employee');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        setUserRole(data?.role ?? 'employee');
      });
    });
  }, []);

  useEffect(() => {
    if (startDate && endDate && endDate >= startDate) {
      setWorkingDays(countWorkingDays(startDate, endDate));
    } else {
      setWorkingDays(null);
    }
  }, [startDate, endDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError('Please select start and end dates.'); return; }
    if (endDate < startDate) { setError('End date must be on or after start date.'); return; }
    if (!workingDays || workingDays < 1) { setError('No working days in selected range.'); return; }

    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const isManagerOrAdmin = ['administrator', 'manager'].includes(userRole);

    const { error: err } = await supabase.from('holidays').insert({
      user_id: user.id,
      entered_by: user.id,
      start_date: startDate,
      end_date: endDate,
      working_days: workingDays,
      notes: notes || null,
      status: isManagerOrAdmin ? 'approved' : 'pending',
      leave_year: getLeaveYear(new Date(startDate)),
      ...(isManagerOrAdmin ? { decided_by: user.id, decided_at: new Date().toISOString() } : {}),
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

      {['administrator', 'manager'].includes(userRole) && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700">
          As a manager or administrator, your holiday will be automatically approved.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First day of leave</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
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
            onChange={e => setEndDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
          />
        </div>

        {workingDays !== null && (
          <div className={workingDays > 0
            ? 'rounded-lg bg-aas-blue-pale border border-aas-blue/20 px-4 py-3 text-sm text-aas-blue font-medium'
            : 'rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 font-medium'
          }>
            {workingDays > 0
              ? `${workingDays} working ${workingDays === 1 ? 'day' : 'days'} (Mon–Fri, weekends excluded)`
              : 'No working days in selected range — try different dates'}
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
            disabled={loading || !workingDays || workingDays < 1}
            className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}
