'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
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
  const [error, setError] = useState('');

  async function updateStatus(newStatus: string) {
    setLoading(newStatus);
    setError('');
    const supabase = createClient();

    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'approved' || newStatus === 'rejected') {
      update.manager_notes = notes || null;
      update.reviewed_at = new Date().toISOString();
    }

    const { error: err } = await supabase.from('expenses').update(update).eq('id', expenseId);
    if (err) {
      setError(err.message);
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  async function handleDelete() {
    if (!confirm('Delete this expense claim? This cannot be undone.')) return;
    setLoading('delete');
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (err) {
      setError(err.message);
      setLoading(null);
      return;
    }
    router.push('/expenses');
  }

  const canDelete = isOwner || isManagerOrAdmin;
  const showManagerNotesReadonly =
    (status === 'approved' || status === 'rejected') && managerNotes;

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {/* Employee: submit draft */}
      {isOwner && status === 'draft' && (
        <button
          onClick={() => updateStatus('submitted')}
          disabled={loading !== null}
          className="w-full py-3 bg-aas-blue text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {loading === 'submitted' ? 'Submitting…' : 'Submit for approval'}
        </button>
      )}

      {/* Employee: recall submitted claim */}
      {isOwner && status === 'submitted' && (
        <button
          onClick={() => updateStatus('draft')}
          disabled={loading !== null}
          className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium disabled:opacity-60"
        >
          {loading === 'draft' ? 'Recalling…' : 'Recall claim'}
        </button>
      )}

      {/* Owner: edit claim (not paid) */}
      {isOwner && status !== 'paid' && (
        <Link
          href={'/expenses/' + expenseId + '/edit'}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Pencil size={14} />
          Edit claim
        </Link>
      )}

      {/* Manager: approve / reject */}
      {isManagerOrAdmin && status === 'submitted' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for rejection, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
            />
          </div>
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
        </div>
      )}

      {/* Manager: mark approved expense as paid */}
      {isManagerOrAdmin && status === 'approved' && (
        <button
          onClick={() => updateStatus('paid')}
          disabled={loading !== null}
          className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          {loading === 'paid' ? 'Marking paid…' : 'Mark as paid'}
        </button>
      )}

      {/* Show recorded manager notes */}
      {showManagerNotesReadonly && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 mb-0.5">Manager notes</p>
          <p className="text-sm text-gray-700">{managerNotes}</p>
        </div>
      )}

      {/* Delete — owner or manager/admin, any status */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-60 transition-colors"
        >
          <Trash2 size={14} />
          {loading === 'delete' ? 'Deleting…' : 'Delete claim'}
        </button>
      )}
    </div>
  );
}
