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
  const { data, error } = await admin.from('expenses').insert({
    user_id: effectiveUserId,
    claim_date: body.claim_date,
    category: body.category,
    description: body.description,
    amount: body.amount,
    currency: body.currency,
    notes: body.notes || null,
    receipt_url: body.receipt_url || null,
    status: body.status ?? 'draft',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
