import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectiveUser } from '@/lib/effective-user';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const { effectiveUserId } = await getEffectiveUser(supabase, user.id, profile?.role ?? 'employee');

  const body = await req.json();
  const admin = createAdminClient();

  const { data: task, error: taskErr } = await admin.from('tasks').insert({
    title: body.title,
    description: body.description || null,
    task_date: body.task_date || null,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    priority: body.priority ?? 'normal',
    status: body.status ?? 'not_started',
    customer_id: body.customer_id || null,
    location_id: body.location_id || null,
    equipment_id: body.equipment_id || null,
    notes: body.notes || null,
    auto_rollover: body.auto_rollover ?? false,
    created_by: effectiveUserId,
  }).select('id').single();

  if (taskErr || !task) {
    return NextResponse.json({ error: taskErr?.message ?? 'Failed to create task' }, { status: 500 });
  }

  if (body.assignees?.length > 0) {
    await admin.from('task_assignees').insert(
      body.assignees.map((uid: string) => ({ task_id: task.id, user_id: uid, assigned_by: effectiveUserId }))
    );
  }

  return NextResponse.json(task);
}
