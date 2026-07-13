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
  if (!body.name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });

  const { data, error } = await supabase.from('vehicles').insert({
    name: body.name,
    type: body.type || 'vehicle',
    registration: body.registration || null,
    make: body.make || null,
    model: body.model || null,
    year: body.year ? parseInt(body.year) : null,
    notes: body.notes || null,
    is_active: true,
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
