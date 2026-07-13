'use server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function startImpersonation(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'administrator') redirect('/staff');
  const { data: target } = await supabase.from('profiles').select('id').eq('id', targetUserId).single();
  if (!target || targetUserId === user.id) redirect('/staff');
  const cookieStore = await cookies();
  cookieStore.set('impersonate_user_id', targetUserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  redirect('/dashboard');
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonate_user_id');
  redirect('/staff');
}
