'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EditHolidayPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!['administrator', 'manager'].includes(profile?.role ?? '')) {
        router.push('/holidays');
        return;
      }

      const res = await fetch(`/api/holidays/${id}`);
      if (!res.ok) { router.push('/holidays'); return; }
      const holiday = await res.json();

      setStartDate(holiday.start_date);
      setEndDate(holiday.end_date);
      setStatus(holiday.status);
      setNotes(holiday.notes ?? '');
      setRejectionReason(holiday.rejection_reason ?? '');

      // Get owner name
      const { data: owner } = await supabase.from('profiles').select('full_name').eq('id', holiday.user_id).single();
      setOwnerName(owner?.full_name ?? '');
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError('Dates are required'); return; }
    if (endDate < startDate) { setError('End must be on or after start'); return; }
    setSaving(true);
    setError('');

    const workingDays = countWorkingDays(startDate, endDate);
    const res = await fetch(`/api/holidays/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        workingDays,
        notes,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Failed to save'); setSaving(false); return; }
    router.push(`/holidays/${id}`);
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/holidays/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Edit holiday</h2>
          {ownerName && <p className="text-sm text-gray-500">{ownerName}</p>}
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First day</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last day</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => setEndDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        {startDate && endDate && endDate >= startDate && (
          <div className="rounded-lg bg-aas-blue-pale border border-aas-blue/20 px-4 py-2.5 text-sm text-aas-blue font-medium">
            {countWorkingDays(startDate, endDate)} working days
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {status === 'rejected' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason</label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              rows={2}
              className={inputClass + ' resize-none'}
              placeholder="Reason for rejection"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className={inputClass + ' resize-none'}
            placeholder="Any notes"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href={`/holidays/${id}`}
            className="flex-1 text-center py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
