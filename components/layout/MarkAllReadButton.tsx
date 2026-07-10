'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter();
  async function markAll() {
    const supabase = createClient();
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);
    router.refresh();
  }
  return (
    <button onClick={markAll} className="text-xs text-aas-blue hover:underline">
      Mark all read
    </button>
  );
}
