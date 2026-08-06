import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const [key, value] of Object.entries(body.settings ?? {})) {
    await admin.from('company_settings').upsert(
      { key, value, updated_by: user.id, updated_at: now },
      { onConflict: 'key' }
    );
  }

  return NextResponse.json({ ok: true });
}
