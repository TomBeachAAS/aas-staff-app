import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { MarkAllReadButton } from '@/components/layout/MarkAllReadButton';
import { NotificationsViewObserver } from '@/components/notifications/NotificationsViewObserver';

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
        <NotificationsViewObserver notifications={notifications ?? []} />
      </Card>
    </div>
  );
}
