'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  job: { id: string; status: string; claimed_by: string | null };
  currentUserId: string;
  isManagerOrAdmin: boolean;
}

export function JobActionButtons({ job, currentUserId, isManagerOrAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  async function update(updates: Record<string, any>) {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update(updates).eq('id', job.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.refresh();
  }

  const isMyClaim = job.claimed_by === currentUserId;
  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none';

  return (
    <div className="space-y-3 pb-6">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* Manager: approve / reject pending job */}
      {isManagerOrAdmin && job.status === 'pending_approval' && (
        showRejectForm ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Reason for rejection (optional)</p>
            <div className="flex gap-2">
              <button onClick={() => setShowRejectForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => update({ status: 'rejected', approved_by: currentUserId })}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Confirm rejection'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => update({ status: 'open', approved_by: currentUserId })}
              disabled={loading}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-green-700 transition-colors"
            >
              {loading ? 'Saving…' : 'Approve — post job'}
            </button>
          </div>
        )
      )}

      {/* Claim */}
      {job.status === 'open' && (
        <button
          onClick={() => update({ status: 'in_progress', claimed_by: currentUserId, claimed_at: new Date().toISOString() })}
          disabled={loading}
          className="w-full py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60 hover:bg-aas-blue-dark transition-colors"
        >
          {loading ? 'Saving…' : 'Claim this job'}
        </button>
      )}

      {/* Unclaim + Complete — for the claimer or a manager */}
      {job.status === 'in_progress' && (isMyClaim || isManagerOrAdmin) && (
        <>
          {showCompleteForm ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Completion notes (optional)</p>
              <textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                rows={3}
                placeholder="Describe what was done…"
                className={inputClass}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowCompleteForm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600">
                  Cancel
                </button>
                <button
                  onClick={() => update({
                    status: 'completed',
                    completed_by: currentUserId,
                    completed_at: new Date().toISOString(),
                    completion_notes: completionNotes.trim() || null,
                  })}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {loading ? 'Saving…' : 'Mark complete'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCompleteForm(true)}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Mark as complete
            </button>
          )}

          {!showCompleteForm && (
            <button
              onClick={() => update({ status: 'open', claimed_by: null, claimed_at: null })}
              disabled={loading}
              className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {loading ? 'Saving…' : 'Unclaim job'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
