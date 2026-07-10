'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
});

export async function login(formData: FormData) {
  const data = loginSchema.parse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  // Check profile status
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'pending') {
      redirect('/pending');
    }
    if (profile?.status === 'disabled') {
      await supabase.auth.signOut();
      return { error: 'Your account has been disabled. Please contact your administrator.' };
    }
  }

  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const data = registerSchema.parse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
  });

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.full_name },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/pending');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
