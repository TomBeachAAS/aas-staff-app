import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { MarkAllReadButton } from '@/components/layout/MarkAllReadButton';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
        <MarkAllReadButton userId={user.id} />
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(notifications ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No notifications</div>
          ) : (
            (notifications ?? []).map(n => (
              <div
                key={n.id}
                className={`px-4 py-3 ${!n.is_read ? 'bg-aas-blue-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <div className="w-2 h-2 bg-aas-blue rounded-full mt-1.5 shrink-0" />}
                  <div className={`flex-1 ${n.is_read ? 'ml-5' : ''}`}>
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
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
