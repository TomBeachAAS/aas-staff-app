import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.from('locations').select('*, customer:customers(id, company_name)').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(viewer?.role ?? '')) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = await req.json();

  const { error } = await supabase.from('locations').update({
    name: body.name || null,
    customer_id: body.customer_id || null,
    address_line1: body.address_line1 || null,
    address_line2: body.address_line2 || null,
    town: body.town || null,
    county: body.county || null,
    postcode: body.postcode || null,
    country: body.country || null,
    latitude: body.latitude ? parseFloat(body.latitude) : null,
    longitude: body.longitude ? parseFloat(body.longitude) : null,
    what3words: body.what3words || null,
    site_contact: body.site_contact || null,
    site_phone: body.site_phone || null,
    access_notes: body.access_notes || null,
    parking_notes: body.parking_notes || null,
    health_safety_notes: body.health_safety_notes || null,
    general_notes: body.general_notes || null,
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
