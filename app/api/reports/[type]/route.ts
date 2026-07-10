import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getLeaveYear } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(profile?.role ?? '')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { type } = await params;
  const { searchParams } = new URL(request.url);
  const leaveYear = parseInt(searchParams.get('year') ?? String(getLeaveYear()));

  let data: Record<string, unknown>[] = [];
  let sheetName = 'Report';
  let filename = `aas-report-${type}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  try {
    if (type === 'holiday') {
      const { data: staff } = await supabase.from('profiles').select('id, full_name, holiday_allowance').eq('status', 'active').order('full_name');
      const rows = [];
      for (const s of staff ?? []) {
        const { data: bal } = await supabase.rpc('get_holiday_balance', { p_user_id: s.id, p_leave_year: leaveYear });
        const b = bal?.[0];
        rows.push({
          'Employee': s.full_name,
          'Allowance (days)': s.holiday_allowance,
          'Adjustments': b?.adjustments ?? 0,
          'Used (days)': b?.used ?? 0,
          'Pending (days)': b?.pending ?? 0,
          'Remaining (days)': b?.remaining ?? 0,
          'Leave Year': `${leaveYear}/${leaveYear + 1}`,
        });
      }
      data = rows;
      sheetName = 'Holiday Report';
    } else if (type === 'expenses') {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*, user:profiles(full_name)')
        .order('claim_date', { ascending: false });
      data = (expenses ?? []).map(e => ({
        'Employee': (e.user as {full_name: string})?.full_name ?? '',
        'Date': e.claim_date,
        'Category': e.category,
        'Description': e.description,
        'Amount (£)': Number(e.amount).toFixed(2),
        'Status': e.status,
        'Submitted': e.submitted_at ? format(new Date(e.submitted_at), 'dd/MM/yyyy') : '',
        'Approved': e.approved_at ? format(new Date(e.approved_at), 'dd/MM/yyyy') : '',
      }));
      sheetName = 'Expenses';
    } else if (type === 'mileage') {
      const { data: claims } = await supabase
        .from('mileage_claims')
        .select('*, user:profiles(full_name)')
        .order('claim_date', { ascending: false });
      data = (claims ?? []).map(c => ({
        'Employee': (c.user as {full_name: string})?.full_name ?? '',
        'Date': c.claim_date,
        'From': c.from_location,
        'To': c.to_location,
        'Reason': c.business_reason,
        'Distance (miles)': Number(c.distance_miles).toFixed(1),
        'Rate (£)': Number(c.rate_per_mile).toFixed(4),
        'Amount (£)': Number(c.calculated_amount).toFixed(2),
        'Status': c.status,
        'Vehicle Reg': c.vehicle_reg ?? '',
      }));
      sheetName = 'Mileage';
    } else if (type === 'sickness') {
      const { data: records } = await supabase
        .from('sickness_records')
        .select('*, user:profiles(full_name)')
        .order('start_date', { ascending: false });
      data = (records ?? []).map(r => ({
        'Employee': (r.user as {full_name: string})?.full_name ?? '',
        'Start Date': r.start_date,
        'End Date': r.end_date ?? 'Ongoing',
        'Type': r.sickness_type,
      }));
      sheetName = 'Sickness';
    } else if (type === 'tasks') {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, created_by_profile:profiles!tasks_created_by_fkey(full_name)')
        .order('task_date', { ascending: false });
      data = (tasks ?? []).map(t => ({
        'Title': t.title,
        'Status': t.status,
        'Priority': t.priority,
        'Date': t.task_date ?? '',
        'Created by': (t.created_by_profile as {full_name: string})?.full_name ?? '',
        'Completed at': t.completed_at ? format(new Date(t.completed_at), 'dd/MM/yyyy HH:mm') : '',
      }));
      sheetName = 'Tasks';
    } else {
      data = [{ 'Note': `Report type '${type}' is not yet implemented.` }];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Report error:', err);
    return new NextResponse('Report generation failed', { status: 500 });
  }
}
