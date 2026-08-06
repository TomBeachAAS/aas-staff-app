import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();

  // Accept single id or array of ids
  const ids: string[] = body.ids ?? (body.id ? [body.id] : []);
  if (ids.length === 0) return NextResponse.json({ success: true });

  const admin = createAdminClient();
  await admin
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .eq('user_id', user.id); // still scope to this user for safety

  return NextResponse.json({ success: true });
}
