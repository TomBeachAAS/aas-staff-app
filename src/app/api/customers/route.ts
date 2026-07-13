import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(viewer?.role ?? '')) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = await req.json();
  const { name, contact_name, email, phone, address, city, postcode, notes } = body;

  if (!name) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });

  const { data, error } = await supabase.from('customers').insert({
    name,
    contact_name: contact_name || null,
    email: email || null,
    phone: phone || null,
    address: address || null,
    city: city || null,
    postcode: postcode || null,
    notes: notes || null,
    status: 'active',
    created_by: user.id,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
