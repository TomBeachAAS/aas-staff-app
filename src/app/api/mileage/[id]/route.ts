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
  const { data: claim } = await admin.from('mileage_claims').select('user_id').eq('id', params.id).single();
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isManagerOrAdmin && claim.user_id !== user.id) {
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
  if (body.from_location !== undefined) updates.from_location = body.from_location;
  if (body.to_location !== undefined) updates.to_location = body.to_location;
  if (body.business_reason !== undefined) updates.business_reason = body.business_reason;
  if (body.distance_miles !== undefined) updates.distance_miles = body.distance_miles;
  if (body.vehicle_reg !== undefined) updates.vehicle_reg = body.vehicle_reg || null;
  if (body.notes !== undefined) updates.notes = body.notes || null;

  const { error } = await admin.from('mileage_claims').update(updates).eq('id', params.id);
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
  const { data: claim } = await admin.from('mileage_claims').select('user_id').eq('id', params.id).single();
  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!isManagerOrAdmin && claim.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('mileage_claims').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
