import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json(); // 'task' | 'job'
  if (!['task', 'job'].includes(action)) {
    return NextResponse.json({ error: 'action must be task or job' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: breakdown } = await admin
    .from('breakdowns')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!breakdown) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (breakdown.status === 'converted') {
    return NextResponse.json({ error: 'Already converted' }, { status: 409 });
  }

  const machineName = breakdown.machine_name ?? 'Unknown machine';
  const title = `${breakdown.title}`;
  const description = `Breakdown report: ${breakdown.description}${breakdown.cause ? `\n\nCause: ${breakdown.cause}` : ''}`;

  const urgencyToPriority: Record<string, string> = {
    critical: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  };
  const priority = urgencyToPriority[breakdown.urgency] ?? 'medium';

  let createdId: string;
  let redirectPath: string;

  if (action === 'task') {
    const { data: task, error } = await admin.from('tasks').insert({
      title,
      description,
      priority,
      status: 'pending',
      created_by: user.id,
      equipment_id: breakdown.equipment_id ?? null,
    }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    createdId = task.id;
    redirectPath = `/tasks/${createdId}`;

    await admin.from('breakdowns').update({
      status: 'converted',
      converted_to_task_id: createdId,
      converted_at: new Date().toISOString(),
      converted_by: user.id,
    }).eq('id', params.id);

  } else {
    const { data: job, error } = await admin.from('job_board').insert({
      title,
      description,
      priority,
      status: 'open',
      created_by: user.id,
      customer_id: null,
      location_id: null,
    }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    createdId = job.id;
    redirectPath = `/jobs/${createdId}`;

    await admin.from('breakdowns').update({
      status: 'converted',
      converted_to_job_id: createdId,
      converted_at: new Date().toISOString(),
      converted_by: user.id,
    }).eq('id', params.id);
  }

  return NextResponse.json({ id: createdId, redirectPath });
}
