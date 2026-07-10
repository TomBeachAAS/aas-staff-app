'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('task_assignees').delete().eq('task_id', taskId);
    await supabase.from('tasks').delete().eq('id', taskId);
    router.push('/tasks');
  }

  if (confirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? 'Deleting…' : 'Yes, delete task'}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center justify-center gap-2 w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
    >
      <Trash2 size={15} />
      Delete task
    </button>
  );
}
