'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  expenseId: string;
  status: string;
  isOwner: boolean;
  isManagerOrAdmin: boolean;
  managerNotes: string | null;
}

export function ExpenseActions({ expenseId, status, isOwner, isManagerOrAdmin, managerNotes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState(managerNotes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [error, setError] = useState('');

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    setError('');
    const supabase = createClient();
    const update: Record<string, unknown> = { status: newStatus };
    if (['approved', 'rejected'].includes(newStatus)) {
      update.manager_notes = notes || null;
      update.reviewed_at = new Date().toISOString();
    }
    const { error: err } = await supabase.from('expenses').update(update).eq('id', expenseId);
    if (err) { setError(err.message); setLoading(null); return; }
    router.refresh();
    setLoading(null);
  }

  async function saveNotes() {
    setLoading('notes');
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('expenses')
      .update({ manager_notes: notes || null })
      .eq('id', expenseId);
    if (err) { setError(err.message); setLoading(null); return; }
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* ── Staff actions ── */}
      {isOwner && status === 'draft' && (
        <button
          onClick={() => updateStatus('submitted')}
          disabled={loading !== null}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {loading === 'submitted' ? 'Submitting…' : 'Submit for approval'}
        </button>
      )}
      {isOwner && status === 'submitted' && (
        <button
          onClick={() => updateStatus('draft')}
          disabled={loading !== null}
          className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium disabled:opacity-60"
        >
          {loading === 'draft' ? 'Recalling…' : 'Recall claim'}
        </button>
      )}

      {/* ── Manager notes — editable on any status ── */}
      {isManagerOrAdmin && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager notes <span className="font-normal text-gray-400">(visible to employee)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
              rows={2}
              placeholder="Add a note…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
            />
          </div>
          {notes !== (managerNotes ?? '') && (
            <button
              onClick={saveNotes}
              disabled={loading !== null}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-60 transition-colors"
            >
              {loading === 'notes' ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save notes'}
            </button>
          )}
        </div>
      )}

      {/* ── Manager status actions ── */}
      {isManagerOrAdmin && status === 'submitted' && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading !== null}
            className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium disabled:opacity-60"
          >
            {loading === 'rejected' ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            onClick={() => updateStatus('approved')}
            disabled={loading !== null}
            className="flex-1 py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {loading === 'approved' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      )}
      {isManagerOrAdmin && status === 'approved' && (
        <div className="flex gap-3">
          <button
            onClick={() => updateStatus('rejected')}
            disabled={loading !== null}
            className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium disabled:opacity-60"
          >
            {loading === 'rejected' ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            onClick={() => updateStatus('paid')}
            disabled={loading !== null}
            className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {loading === 'paid' ? 'Marking paid…' : 'Mark as paid'}
          </button>
        </div>
      )}
      {isManagerOrAdmin && status === 'rejected' && (
        <button
          onClick={() => updateStatus('approved')}
          disabled={loading !== null}
          className="w-full py-2.5 bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {loading === 'approved' ? 'Approving…' : 'Approve instead'}
        </button>
      )}

      {/* ── Notes visible to owner (read-only) ── */}
      {!isManagerOrAdmin && managerNotes && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Manager notes</p>
          <p className="text-sm text-gray-700">{managerNotes}</p>
        </div>
      )}
    </div>
  );
}
