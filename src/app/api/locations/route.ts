import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const name = ((body.name) ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const { address_line1, town, postcode, customer_id } = body;

  const admin = createAdminClient();
  const { data, error } = await admin.from('locations').insert({
    name,
    address_line1: address_line1 || null,
    town: town || null,
    postcode: postcode || null,
    customer_id: customer_id || null,
    is_active: true,
  }).select('id, name, customer_id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
