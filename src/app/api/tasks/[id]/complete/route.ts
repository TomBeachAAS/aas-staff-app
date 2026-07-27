import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Verify auth with user client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { completion_notes } = body;

  // Use admin client for all DB ops — bypasses RLS which blocks employees silently
  const admin = createAdminClient();

  const { data: task } = await admin
    .from('tasks')
    .select('id, created_by, status')
    .eq('id', id)
    .single();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  if (['completed', 'cancelled'].includes(task.status)) {
    return NextResponse.json({ error: 'Task is already completed or cancelled.' }, { status: 400 });
  }

  // Check permission: manager/admin, task creator, or assignee
  const [{ data: profile }, { data: assignee }] = await Promise.all([
    admin.from('profiles').select('role').eq('id', user.id).single(),
    admin.from('task_assignees').select('user_id').eq('task_id', id).eq('user_id', user.id).maybeSingle(),
  ]);

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');
  const canComplete = isManagerOrAdmin || task.created_by === user.id || !!assignee;

  if (!canComplete) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { error } = await admin
    .from('tasks')
    .update({
      status: 'completed',
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      completion_notes: completion_notes || null,
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
