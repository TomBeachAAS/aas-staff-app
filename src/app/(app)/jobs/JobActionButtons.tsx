'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  job: any;
  currentUserId: string;
  isManagerOrAdmin: boolean;
  claimedByName?: string;
}

export function JobActionButtons({ job, currentUserId, isManagerOrAdmin, claimedByName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showComplete, setShowComplete] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showReject, setShowReject] = useState(false);

  const isClaimer = job.claimed_by === currentUserId;
  const canComplete = isClaimer || isManagerOrAdmin;

  async function handleClaim() {
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update({
      status: 'in_progress',
      claimed_by: currentUserId,
      claimed_at: new Date().toISOString(),
    }).eq('id', job.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.refresh();
  }

  async function handleUnclaim() {
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update({
      status: 'open',
      claimed_by: null,
      claimed_at: null,
    }).eq('id', job.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.refresh();
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update({
      status: 'completed',
      completed_by: currentUserId,
      completed_at: new Date().toISOString(),
      completion_notes: completionNotes.trim() || null,
    }).eq('id', job.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/jobs');
  }

  async function handleApprove() {
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update({
      status: 'open',
      approved_by: currentUserId,
      approved_at: new Date().toISOString(),
    }).eq('id', job.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/jobs');
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('job_board').update({
      status: 'rejected',
      approved_by: currentUserId,
      approved_at: new Date().toISOString(),
    }).eq('id', job.id);
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/jobs');
  }

  if (job.status === 'completed' || job.status === 'rejected') return null;

  return (
    <div className="space-y-3">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* Pending approval */}
      {job.status === 'pending_approval' && isManagerOrAdmin && !showReject && (
        <div className="flex gap-2">
          <button onClick={handleApprove} disabled={loading}
            className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Approve — add to board'}
          </button>
          <button onClick={() => setShowReject(true)}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
            Reject
          </button>
        </div>
      )}

      {job.status === 'pending_approval' && isManagerOrAdmin && showReject && (
        <form onSubmit={handleReject} className="space-y-3">
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : 'Confirm rejection'}
          </button>
          <button type="button" onClick={() => setShowReject(false)} className="w-full py-2 text-sm text-gray-500">
            Cancel
          </button>
        </form>
      )}

      {job.status === 'pending_approval' && !isManagerOrAdmin && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-700">
          Waiting for manager approval before it appears on the board.
        </div>
      )}

      {/* Open — claim it */}
      {job.status === 'open' && (
        <button onClick={handleClaim} disabled={loading}
          className="w-full py-2.5 bg-aas-blue text-white rounded-xl text-sm font-medium hover:bg-aas-blue-dark disabled:opacity-60">
          {loading ? 'Saving…' : "I'll do this job"}
        </button>
      )}

      {/* In progress */}
      {job.status === 'in_progress' && canComplete && !showComplete && (
        <div className="space-y-2">
          <button onClick={() => setShowComplete(true)}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
            Mark as complete
          </button>
          {isClaimer && (
            <button onClick={handleUnclaim} disabled={loading}
              className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              {loading ? '…' : 'Release — put back on board'}
            </button>
          )}
        </div>
      )}

      {job.status === 'in_progress' && !canComplete && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
          In progress — being handled by {claimedByName ?? 'a colleague'}
        </div>
      )}

      {showComplete && (
        <form onSubmit={handleComplete} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completion notes (optional)</label>
            <textarea
              value={completionNotes}
              onChange={e => setCompletionNotes(e.target.value)}
              rows={3}
              placeholder="How did it go? Any notes?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
            {loading ? 'Saving…' : 'Confirm complete'}
          </button>
          <button type="button" onClick={() => setShowComplete(false)} className="w-full py-2 text-sm text-gray-500">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
