import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectiveUser } from '@/lib/effective-user';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { effectiveUserId, effectiveRole } = await getEffectiveUser(
    supabase, user.id, profile?.role ?? 'employee'
  );

  const isManagerOrAdmin = ['administrator', 'manager'].includes(effectiveRole);

  const body = await req.json();
  const { startDate, endDate, workingDays, notes, leaveYear } = body;

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after start date' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('holidays').insert({
    user_id: effectiveUserId,
    entered_by: user.id,        // always the real user who submitted
    start_date: startDate,
    end_date: endDate,
    working_days: workingDays ?? 0,
    notes: notes || null,
    status: isManagerOrAdmin ? 'approved' : 'pending',
    leave_year: leaveYear,
    ...(isManagerOrAdmin ? { decided_by: user.id, decided_at: new Date().toISOString() } : {}),
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
