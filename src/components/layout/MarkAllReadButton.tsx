'use client';

import { useRouter } from 'next/navigation';

export function MarkAllReadButton({ userId }: { userId: string }) {
  const router = useRouter();
  async function markAll() {
    await fetch('/api/notifications/mark-all', { method: 'POST' });
    router.refresh();
  }
  return (
    <button onClick={markAll} className="text-xs text-aas-blue hover:underline">
      Mark all read
    </button>
  );
}
