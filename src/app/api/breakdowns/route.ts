import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/notifications/push';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('breakdowns')
    .select(`
      *,
      reporter:profiles!reported_by(full_name),
      equipment:equipment(name)
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, description, cause, equipment_id, machine_name, can_continue, urgency, photos, reported_at } = body;

  if (!title?.trim() || !description?.trim()) {
    return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: breakdown, error } = await admin.from('breakdowns').insert({
    reported_by: user.id,
    reported_at: reported_at ?? new Date().toISOString(),
    title: title.trim(),
    description: description.trim(),
    cause: cause?.trim() || null,
    equipment_id: equipment_id || null,
    machine_name: machine_name?.trim() || null,
    can_continue: can_continue ?? 'yes',
    urgency: urgency ?? 'medium',
    status: 'open',
    photos: photos ?? [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert in-app notification for all managers/admins
  const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
  const reporterName = profile?.full_name ?? 'Someone';

  const { data: managers } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['administrator', 'manager'])
    .eq('status', 'active')
    .neq('id', user.id);

  if (managers?.length) {
    const urgencyLabel = urgency === 'critical' ? '🔴 CRITICAL' : urgency === 'high' ? '🟠 High' : urgency === 'medium' ? '🟡 Medium' : '⚪ Low';
    const notifTitle = `${urgencyLabel} breakdown: ${title.trim()}`;
    const notifBody = `Reported by ${reporterName}. ${can_continue === 'no' ? 'Machine is grounded.' : can_continue === 'caution' ? 'Use with caution.' : 'Can continue working.'}`;

    await admin.from('notifications').insert(
      managers.map((m: any) => ({
        user_id: m.id,
        title: notifTitle,
        body: notifBody,
        link: `/breakdowns/${breakdown.id}`,
        is_read: false,
      }))
    );

    // Push notification for critical only
    if (urgency === 'critical') {
      await Promise.allSettled(
        managers.map((m: any) =>
          sendPushToUser(m.id, {
            title: `🔴 Critical breakdown: ${title.trim()}`,
            body: notifBody,
            url: `/breakdowns/${breakdown.id}`,
          })
        )
      );
    }
  }

  return NextResponse.json(breakdown, { status: 201 });
}
