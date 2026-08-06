import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectiveUser } from '@/lib/effective-user';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const { effectiveUserId } = await getEffectiveUser(supabase, user.id, profile?.role ?? 'employee');

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from('job_board').insert({
    title: body.title,
    description: body.description || null,
    priority: body.priority ?? 'normal',
    status: body.status ?? 'open',
    customer_id: body.customer_id || null,
    location_id: body.location_id || null,
    created_by: effectiveUserId,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
