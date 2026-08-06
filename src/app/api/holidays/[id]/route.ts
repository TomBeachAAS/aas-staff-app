import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('holidays')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Staff can only view their own
  if (data.user_id !== user.id && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');
  if (!isManagerOrAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { startDate, endDate, workingDays, notes, status, rejectionReason } = body;

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (startDate !== undefined) updates.start_date = startDate;
  if (endDate !== undefined) updates.end_date = endDate;
  if (workingDays !== undefined) updates.working_days = workingDays;
  if (notes !== undefined) updates.notes = notes || null;
  if (status !== undefined) {
    updates.status = status;
    updates.decided_by = user.id;
    updates.decided_at = new Date().toISOString();
  }
  if (rejectionReason !== undefined) updates.rejection_reason = rejectionReason || null;

  const { data, error } = await admin
    .from('holidays')
    .update(updates)
    .eq('id', params.id)
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: holiday } = await admin.from('holidays').select('user_id').eq('id', params.id).single();
  if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  if (holiday.user_id !== user.id && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('holidays').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
