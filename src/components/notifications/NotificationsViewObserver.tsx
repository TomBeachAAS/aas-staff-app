'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
  link: string | null;
};

export function NotificationsViewObserver({ notifications: initial }: { notifications: Notification[] }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unread = initial.filter(n => !n.is_read);
    if (unread.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const toMark: string[] = [];
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.notifId;
            if (id && !pendingRef.current.has(id)) {
              pendingRef.current.add(id);
              toMark.push(id);
              observer.unobserve(entry.target);
            }
          }
        });

        if (toMark.length > 0) {
          setReadIds(prev => new Set([...prev, ...toMark]));
          const supabase = createClient();
          supabase.from('notifications').update({ is_read: true }).in('id', toMark);
        }
      },
      { threshold: 0.5 }
    );

    unread.forEach(n => {
      const el = document.querySelector('[data-notif-id="' + n.id + '"]');
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="divide-y divide-gray-50">
      {initial.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">No notifications</div>
      ) : (
        initial.map(n => {
          const isRead = n.is_read || readIds.has(n.id);
          return (
            <div
              key={n.id}
              data-notif-id={n.id}
              className={'px-4 py-3 transition-colors duration-300 ' + (!isRead ? 'bg-blue-50' : '')}
            >
              <div className="flex items-start gap-3">
                <div className={'w-2 h-2 rounded-full mt-1.5 shrink-0 transition-colors duration-300 ' + (!isRead ? 'bg-aas-blue' : 'bg-transparent')} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), 'd MMM yyyy HH:mm')}</p>
                  {n.link && (
                    <Link href={n.link} className="text-xs text-aas-blue hover:underline mt-0.5 inline-block">
                      View →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
