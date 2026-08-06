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

  const { action, weekLabel, weekStartStr, userId } = await req.json();
  if (!action || !['submit', 'approve'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  // Only managers/admins can approve; staff can only submit their own
  if (action === 'approve' && !isManagerOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const newStatus = action === 'approve' ? 'approved' : 'submitted';
  const targetUserId = userId || user.id;

  // Auto-confirm any remaining auto-populated entries
  await admin
    .from('timesheet_entries')
    .update({ is_auto_populated: false })
    .eq('period_id', params.id)
    .eq('is_auto_populated', true);

  const { error } = await admin
    .from('timesheet_periods')
    .update({ is_locked: true, status: newStatus })
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send notification
  await admin.from('notifications').insert({
    user_id: targetUserId,
    title: action === 'approve' ? 'Timesheet approved' : 'Timesheet submitted',
    body: action === 'approve'
      ? `Your timesheet for ${weekLabel} has been approved.`
      : `Your timesheet for ${weekLabel} has been submitted.`,
    link: `/timesheets?week=${weekStartStr}`,
    is_read: false,
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
