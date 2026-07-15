'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function TaskCompleteForm({ taskId, userId }: { taskId: string; userId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.from('tasks').update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
        completion_notes: notes || null,
      }).eq('id', taskId);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.refresh(), 800);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 py-2.5 px-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
        <CheckCircle size={16} />
        Marked as complete!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {showNotes && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Completion notes (optional)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes about how this was completed…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue resize-none"
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={complete}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
        >
          <CheckCircle size={16} />
          {loading ? 'Marking complete…' : 'Mark as complete'}
        </button>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-600"
        >
          + Notes
        </button>
      </div>
    </div>
  );
}
