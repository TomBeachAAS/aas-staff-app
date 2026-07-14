import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/notifications/push';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, data } = await request.json();

  try {
    if (type === 'task_assigned') {
      const { assignees, taskTitle, assignedBy } = data;
      const recipients = (assignees as string[]).filter(id => id !== assignedBy);
      await Promise.all(
        recipients.map((userId: string) =>
          sendPushToUser(userId, {
            title: '📋 New task assigned',
            body: taskTitle,
            url: '/tasks',
          })
        )
      );
    }

    if (type === 'holiday_decision') {
      const { holidayId, status } = data;
      const admin = createAdminClient();
      const { data: holiday } = await admin
        .from('holidays')
        .select('user_id')
        .eq('id', holidayId)
        .single();
      if (holiday) {
        await sendPushToUser(holiday.user_id, {
          title: status === 'approved' ? '🌴 Holiday approved' : '❌ Holiday declined',
          body: status === 'approved'
            ? 'Your holiday request has been approved.'
            : 'Your holiday request was not approved.',
          url: '/holidays',
        });
      }
    }

    if (type === 'job_assigned') {
      const { userId, jobTitle } = data;
      await sendPushToUser(userId, {
        title: '🔧 New job assigned',
        body: jobTitle,
        url: '/jobs',
      });
    }
  } catch (err) {
    console.error('Notification error:', err);
  }

  return NextResponse.json({ ok: true });
}
