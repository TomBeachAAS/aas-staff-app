import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:tom.beach@autonomousagrisolutions.co.uk',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const supabase = createAdminClient();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions?.length) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payloadStr
      ).catch(async (err: any) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      })
    )
  );
}
