'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Play } from 'lucide-react';

export function TaskStartButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 border border-aas-blue text-aas-blue rounded-lg text-sm font-medium hover:bg-aas-blue-pale disabled:opacity-60"
    >
      <Play size={14} />
      {loading ? 'Starting…' : 'Start task'}
    </button>
  );
}
