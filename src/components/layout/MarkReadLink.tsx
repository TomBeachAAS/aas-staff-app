'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function MarkReadLink({ notificationId, href, isRead }: { notificationId: string; href: string; isRead: boolean }) {
  const router = useRouter();

  async function handleClick() {
    if (!isRead) {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      });
      router.refresh();
    }
  }

  return (
    <Link href={href} onClick={handleClick} className="text-xs text-aas-blue hover:underline mt-0.5 inline-block">
      View →
    </Link>
  );
}
