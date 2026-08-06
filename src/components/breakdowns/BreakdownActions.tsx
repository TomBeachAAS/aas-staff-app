'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, Briefcase, Trash2 } from 'lucide-react';

interface Props {
  breakdownId: string;
  isManagerOrAdmin: boolean;
  reportedBy: string;
  currentUserId: string;
}

export function BreakdownActions({ breakdownId, isManagerOrAdmin, reportedBy, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const canDelete = reportedBy === currentUserId || isManagerOrAdmin;

  async function convert(action: 'task' | 'job') {
    setLoading(action);
    setError('');
    const res = await fetch(`/api/breakdowns/${breakdownId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) { setError(data.error ?? 'Failed to convert'); return; }
    router.push(data.redirectPath);
  }

  async function resolve() {
    setLoading('resolve');
    setError('');
    const res = await fetch(`/api/breakdowns/${breakdownId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'resolved',
        resolution_notes: resolutionNotes.trim() || null,
        resolved_at: new Date().toISOString(),
        resolved_by: currentUserId,
      }),
    });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed'); return; }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm('Delete this breakdown report?')) return;
    setLoading('delete');
    const res = await fetch(`/api/breakdowns/${breakdownId}`, { method: 'DELETE' });
    setLoading(null);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Failed to delete'); return; }
    router.push('/breakdowns');
  }

  return (
    <div className="space-y-3 pb-6">
      {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{error}</div>}

      {/* Convert to Task */}
      <button
        onClick={() => convert('task')}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-aas-blue text-white rounded-lg text-sm font-medium disabled:opacity-60"
      >
        <ClipboardList size={16} />
        {loading === 'task' ? 'Creating task…' : 'Raise as Task'}
      </button>

      {/* Convert to Job */}
      <button
        onClick={() => convert('job')}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
      >
        <Briefcase size={16} />
        {loading === 'job' ? 'Creating job…' : 'Raise as Job'}
      </button>

      {/* Resolve */}
      {showResolveForm ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Resolution notes (optional)</p>
          <textarea
            value={resolutionNotes}
            onChange={e => setResolutionNotes(e.target.value)}
            rows={3}
            placeholder="What was done to fix it?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowResolveForm(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={resolve}
              disabled={loading === 'resolve'}
              className="flex-1 py-2.5 bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {loading === 'resolve' ? 'Saving…' : 'Mark resolved'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowResolveForm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <CheckCircle2 size={16} />
          Mark as resolved (no task/job needed)
        </button>
      )}

      {/* Delete */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          <Trash2 size={16} />
          {loading === 'delete' ? 'Deleting…' : 'Delete report'}
        </button>
      )}
    </div>
  );
}
