import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
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
  const { company_name, contact_name, email, phone, address, city, postcode, notes, status } = body;

  if (!company_name) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });

  const { error } = await supabase.from('customers').update({
    company_name,
    contact_name: contact_name || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    city: city || null,
    postcode: postcode || null,
    notes: notes || null,
    status: status || 'active',
  }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
