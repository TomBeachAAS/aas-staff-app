import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin.from('sickness_records').insert({
    user_id: body.user_id || user.id,
    entered_by: user.id,
    start_date: body.start_date,
    end_date: body.end_date || null,
    sickness_type: body.sickness_type,
    private_notes: body.private_notes || null,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
