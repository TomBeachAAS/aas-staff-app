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

function countTotalDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  const s = new Date(start + 'T12:00:00');
  const e = new Date(end + 'T12:00:00');
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
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
  const [totalDays, setTotalDays] = useState<number | null>(null);
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
    setTotalDays(countTotalDays(startDate, endDate));
  } else {
    setWorkingDays(null);
    setTotalDays(null);
  }
}, [startDate, endDate]);

const datesValid = !!(startDate && endDate && endDate >= startDate);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!startDate || !endDate) { setError('Please select start and end dates.'); return; }
  if (endDate < startDate) { setError('End date must be on or after start date.'); return; }

  setLoading(true);
  setError('');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { router.push('/login'); return; }

  const isManagerOrAdmin = ['administrator', 'manager'].includes(userRole);
  const days = workingDays ?? 0;

  const { error: err } = await supabase.from('holidays').insert({
    user_id: user.id,
    entered_by: user.id,
    start_date: startDate,
    end_date: endDate,
    working_days: days,
    notes: notes || null,
    status: isManagerOrAdmin ? 'approved' : 'pending',
    leave_year: getLeaveYear(new Date(startDate)),
    ...(isManagerOrAdmin ? { decided_by: user.id, decided_at: new Date().toISOString() } : {}),
  });

  if (err) { setError(err.message); setLoading(false); return; }
  router.push('/holidays');
}

function getDaysSummary() {
  if (totalDays === null || workingDays === null) return null;
  const weekendDays = totalDays - workingDays;
  if (workingDays === 0) {
    return { type: 'weekend', text: `${totalDays} weekend ${totalDays === 1 ? 'day' : 'days'} — no holiday allowance deducted` };
  }
  if (weekendDays > 0) {
    return { type: 'mixed', text: `${workingDays} working ${workingDays === 1 ? 'day' : 'days'} deducted from allowance (${weekendDays} weekend ${weekendDays === 1 ? 'day' : 'days'} included free)` };
  }
  return { type: 'weekdays', text: `${workingDays} working ${workingDays === 1 ? 'day' : 'days'} deducted from allowance` };
}

const summary = getDaysSummary();

return (
  <div className="p-4 max-w-md mx-auto">
  <h2 className="text-lg font-bold text-gray-800 mb-5">Request holiday</h2>h2>
  
    {error && (
    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>div>
  )}
  
    {['administrator', 'manager'].includes(userRole) && (
    <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100 text-xs text-green-700">
    As a manager or administrator, your holiday will be automatically approved.
    </div>div>
  )}
  
  <form onSubmit={handleSubmit} className="space-y-4">
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">First day of leave</label>label>
  <input
    type="date"
    value={startDate}
    onChange={e => setStartDate(e.target.value)}
    required
    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
    />
  </div>div>
  
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Last day of leave</label>label>
  <input
    type="date"
    value={endDate}
    min={startDate}
    onChange={e => setEndDate(e.target.value)}
    required
    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
    />
  </div>div>
  
    {summary && (
    <div className={
      summary.type === 'weekend'
      ? 'rounded-lg bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-700 font-medium'
      : 'rounded-lg bg-aas-blue-pale border border-aas-blue/20 px-4 py-3 text-sm text-aas-blue font-medium'
    }>
      {summary.text}
    </div>div>
  )}
  
  <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>label>
  <textarea
    value={notes}
    onChange={e => setNotes(e.target.value)}
    rows={3}
    placeholder="Any additional information for your manager"
    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
    />
  </div>div>
  
  <div className="flex gap-3 pt-2">
  <button
    type="button"
    onClick={() => router.back()}
    className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
  Cancel
  </button>button>
  <button
    type="submit"
    disabled={loading || !datesValid}
    className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors disabled:opacity-60"
    >
    {loading ? 'Submitting…' : 'Submit request'}
  </button>button>
  </div>div>
  </form>form>
  </div>div>
  );
}</div>
