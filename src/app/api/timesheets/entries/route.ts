import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { periodId, userId, workDate, startTime, endTime, notes, entryId } = body;

  if (!periodId || !workDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Only allow editing own entries unless manager/admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');
  const targetUserId = userId || user.id;
  if (targetUserId !== user.id && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();

  if (entryId) {
    const { data, error } = await admin
      .from('timesheet_entries')
      .update({
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        is_auto_populated: false,
      })
      .eq('id', entryId)
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { data, error } = await admin
      .from('timesheet_entries')
      .insert({
        period_id: periodId,
        user_id: targetUserId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        is_auto_populated: false,
      })
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
}
