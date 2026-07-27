import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  // Accept both 'name' (sent by the form) and 'company_name' for backwards compat
  const company_name = ((body.company_name || body.name) ?? '').trim();
  const { contact_name, email, phone, address, city, postcode, notes } = body;

  if (!company_name) return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });

  // Use admin client to bypass RLS INSERT restriction — auth already verified above
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('customers').insert({
    company_name,
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
