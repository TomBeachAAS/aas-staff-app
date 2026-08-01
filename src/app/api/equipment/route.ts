import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('equipment')
    .select('id, name, type, make, model, year, registration, serial_no, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  // Use admin client so all authenticated staff can create equipment (bypasses RLS)
  const admin = createAdminClient();
  const { data, error } = await admin.from('equipment').insert({
    name: body.name.trim(),
    type: body.type || null,
    make: body.make || null,
    model: body.model || null,
    year: body.year ? parseInt(body.year) : null,
    registration: body.registration || null,
    serial_no: body.serial_no || null,
    notes: body.notes || null,
    is_active: true,
  }).select('id, name, registration').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
