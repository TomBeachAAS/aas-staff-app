'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createStaffMember(
  prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (viewer?.role !== 'administrator') return { error: 'Not authorised' };

  const email             = (formData.get('email') as string ?? '').trim().toLowerCase();
  const full_name         = (formData.get('full_name') as string ?? '').trim();
  const role              = (formData.get('role') as string) ?? 'employee';
  const job_title         = (formData.get('job_title') as string ?? '').trim() || null;
  const department        = (formData.get('department') as string ?? '').trim() || null;
  const phone             = (formData.get('phone') as string ?? '').trim() || null;
  const start_date        = (formData.get('start_date') as string) || null;
  const holiday_allowance = parseInt(formData.get('holiday_allowance') as string) || 28;
  const weekly_hours      = parseFloat(formData.get('weekly_hours') as string) || 40;
  const timesheet_access  = formData.get('timesheet_access') === 'on';
  const expenses_access   = formData.get('expenses_access') === 'on';

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const workingDays = Object.fromEntries(days.map(d => [d, formData.get('day_' + d) === 'on']));

  if (!email || !full_name) return { error: 'Name and email are required.' };

  const admin = adminClient();

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
  });

  if (inviteErr) return { error: inviteErr.message };

  const newUserId = invite.user.id;

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: newUserId,
    email,
    full_name,
    role,
    job_title,
    department,
    phone,
    start_date: start_date || null,
    holiday_allowance,
    timesheet_access,
    expenses_access,
    status: 'active',
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return { error: profileErr.message };
  }

  await admin.from('working_patterns').insert({
    user_id: newUserId,
    weekly_hours,
    is_current: true,
    ...workingDays,
  });

  redirect('/staff');
}
