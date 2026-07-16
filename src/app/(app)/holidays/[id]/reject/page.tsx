import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ApproveHolidayForm } from '@/components/holidays/ApproveHolidayForm';

export default async function RejectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(profile?.role ?? '')) redirect('/holidays');

  const { data: holiday } = await supabase
    .from('holidays')
    .select('*')
    .eq('id', id)
    .single();

  if (!holiday || holiday.status !== 'pending') redirect('/holidays?filter=pending');

  const { data: requester } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', holiday.user_id)
    .single();

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-gray-800 mb-2">Review holiday request</h2>
      <div className="bg-aas-blue-pale rounded-xl px-4 py-3 mb-5">
        <p className="text-sm font-semibold text-aas-blue-dark">{requester?.full_name ?? 'Unknown'}</p>
        <p className="text-sm text-gray-700">{format(new Date(holiday.start_date), 'd MMM')} to {format(new Date(holiday.end_date), 'd MMM yyyy')}</p>
        <p className="text-xs text-gray-500">{holiday.working_days} {holiday.working_days === 1 ? 'day' : 'days'}</p>
        {holiday.notes && <p className="text-xs text-gray-600 mt-1 italic">"{holiday.notes}"</p>}
      </div>
      <ApproveHolidayForm holidayId={id} approvedBy={user.id} defaultAction="reject" />
    </div>
  );
}
