import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (viewer?.role !== 'administrator') return NextResponse.json({ error: 'Not authorised' }, { status: 403 });

  const body = await req.json();
  const { email, full_name, role, job_title, department, phone,
    start_date, holiday_allowance, weekly_hours,
    timesheet_access, expenses_access, working_days } = body;

  if (!email || !full_name) return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });

  const admin = adminClient();

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
  });
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });

  const newUserId = invite.user.id;

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: newUserId, email, full_name,
    role: role || 'employee',
    job_title: job_title || null,
    department: department || null,
    phone: phone || null,
    start_date: start_date || null,
    holiday_allowance: holiday_allowance || 28,
    timesheet_access: timesheet_access !== false,
    expenses_access: expenses_access !== false,
    status: 'active',
  });

  if (profileErr) {
    await admin.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayFields = Object.fromEntries(days.map(d => [d, (working_days || []).includes(d)]));

  await admin.from('working_patterns').insert({
    user_id: newUserId,
    weekly_hours: weekly_hours || 40,
    is_current: true,
    ...dayFields,
  });

  return NextResponse.json({ success: true });
}
