import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { periodId } = await req.json();
  if (!periodId) return NextResponse.json({ error: 'periodId required' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('timesheet_entries')
    .update({ is_auto_populated: false })
    .eq('period_id', periodId)
    .eq('is_auto_populated', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
