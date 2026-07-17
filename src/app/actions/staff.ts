'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleHidden(staffId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (viewer?.role !== 'administrator') return;

  const { data: target } = await supabase.from('profiles').select('hidden').eq('id', staffId).single();
  await supabase.from('profiles').update({ hidden: !target?.hidden }).eq('id', staffId);
  revalidatePath('/staff');
}
