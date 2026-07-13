import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ role: null });
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return NextResponse.json({ role: data?.role ?? null });
}
