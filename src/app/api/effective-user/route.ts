import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveUser } from '@/lib/effective-user';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const { effectiveUserId, effectiveRole, isImpersonating } = await getEffectiveUser(
    supabase, user.id, profile?.role ?? 'employee'
  );

  let effectiveName = profile?.full_name ?? '';
  if (isImpersonating) {
    const { data: imp } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', effectiveUserId)
      .single();
    effectiveName = imp?.full_name ?? '';
  }

  return NextResponse.json({ effectiveUserId, effectiveRole, isImpersonating, effectiveName });
}
