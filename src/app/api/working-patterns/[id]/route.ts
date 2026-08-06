import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from('working_patterns').update({
    user_id: body.user_id,
    is_current: true,
    mon: body.mon, tue: body.tue, wed: body.wed,
    thu: body.thu, fri: body.fri, sat: body.sat, sun: body.sun,
    weekly_hours: body.weekly_hours,
  }).eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
