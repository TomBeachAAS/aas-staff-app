import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.task_date !== undefined) updates.task_date = body.task_date || null;
  if (body.all_day !== undefined) updates.all_day = body.all_day;
  if (body.start_time !== undefined) updates.start_time = body.start_time || null;
  if (body.end_time !== undefined) updates.end_time = body.end_time || null;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.customer_id !== undefined) updates.customer_id = body.customer_id || null;
  if (body.location_id !== undefined) updates.location_id = body.location_id || null;
  if (body.equipment_id !== undefined) updates.equipment_id = body.equipment_id || null;

  const { error: taskErr } = await admin.from('tasks').update(updates).eq('id', params.id);
  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });

  // Update assignees if provided
  if (body.assignees !== undefined) {
    await admin.from('task_assignees').delete().eq('task_id', params.id);
    if (body.assignees.length > 0) {
      await admin.from('task_assignees').insert(
        body.assignees.map((userId: string) => ({ task_id: params.id, user_id: userId }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  await admin.from('task_assignees').delete().eq('task_id', params.id);
  const { error } = await admin.from('tasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
