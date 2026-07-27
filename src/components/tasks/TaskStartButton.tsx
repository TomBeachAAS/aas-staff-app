'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, AlertCircle } from 'lucide-react';

export function TaskStartButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={handleStart}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 border border-aas-blue text-aas-blue rounded-lg text-sm font-medium hover:bg-aas-blue-pale disabled:opacity-60"
      >
        <Play size={14} />
        {loading ? 'Starting…' : 'Start task'}
      </button>
    </div>
  );
}
