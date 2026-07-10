'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ApproveHolidayForm({ holidayId, approvedBy }: { holidayId: string; approvedBy: string }) {
  const router = useRouter();
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('holidays')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        decided_by: approvedBy,
        decided_at: new Date().toISOString(),
        rejection_reason: action === 'reject' && reason ? reason : null,
      })
      .eq('id', holidayId);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/holidays?filter=pending');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-2">
        {(['approve', 'reject'] as const).map(a => (
          <button
            key={a}
            type="button"
            onClick={() => setAction(a)}
            className={`py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              action === a
                ? a === 'approve' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                : 'border border-gray-200 text-gray-600'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {action === 'reject' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
            placeholder="Reason for rejection"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">Cancel</button>
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
        >
          {loading ? 'Saving…' : action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
        </button>
      </div>
    </form>
  );
}
