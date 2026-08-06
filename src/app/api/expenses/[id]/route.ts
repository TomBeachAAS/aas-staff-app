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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const admin = createAdminClient();
  const { data: expense } = await admin.from('expenses').select('user_id, status').eq('id', params.id).single();
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Staff can only update their own non-paid expenses
  if (!isManagerOrAdmin && expense.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === 'approved' || body.status === 'rejected') {
      updates.manager_notes = body.manager_notes ?? null;
      updates.reviewed_at = new Date().toISOString();
    }
  }
  if (body.claim_date !== undefined) updates.claim_date = body.claim_date;
  if (body.category !== undefined) updates.category = body.category;
  if (body.description !== undefined) updates.description = body.description;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.receipt_url !== undefined) updates.receipt_url = body.receipt_url;

  const { error } = await admin.from('expenses').update(updates).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const admin = createAdminClient();
  const { data: expense } = await admin.from('expenses').select('user_id').eq('id', params.id).single();
  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!isManagerOrAdmin && expense.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('expenses').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
