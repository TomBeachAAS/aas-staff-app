import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Umbrella } from 'lucide-react';
import { HolidayStatusBadge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { WithdrawHolidayButton } from '@/components/holidays/WithdrawHolidayButton';

export const dynamic = 'force-dynamic';

export default async function HolidayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.holiday_access) redirect('/dashboard');

  const { data: holiday, error } = await supabase
    .from('holidays')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !holiday) redirect('/holidays');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isOwner = holiday.user_id === user.id;
  if (!isOwner && !isManagerOrAdmin) redirect('/holidays');

  // Fetch requester and decision-maker names
  const userIds = [...new Set([holiday.user_id, holiday.decided_by].filter(Boolean))];
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);
  const profileMap = Object.fromEntries((profileRows ?? []).map(p => [p.id, p.full_name]));

  const canWithdraw = isOwner && holiday.status === 'pending';
  const canApprove = isManagerOrAdmin && holiday.status === 'pending';

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/holidays" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Holiday request</h2>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-aas-blue-pale flex items-center justify-center shrink-0">
                <Umbrella size={18} className="text-aas-blue" />
              </div>
              <div>
                {!isOwner && <p className="text-xs text-gray-400">{profileMap[holiday.user_id] ?? 'Unknown'}</p>}
                <p className="text-base font-semibold text-gray-800">
                  {format(new Date(holiday.start_date), 'd MMM')} – {format(new Date(holiday.end_date), 'd MMM yyyy')}
                </p>
                <p className="text-sm text-gray-500">
                  {holiday.working_days} {holiday.working_days === 1 ? 'working day' : 'working days'}
                </p>
              </div>
            </div>
            <HolidayStatusBadge status={holiday.status} />
          </div>

          {holiday.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700 italic">"{holiday.notes}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Start</p>
              <p className="text-gray-700">{format(new Date(holiday.start_date), 'EEE d MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">End</p>
              <p className="text-gray-700">{format(new Date(holiday.end_date), 'EEE d MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Requested</p>
              <p className="text-gray-700">{format(new Date(holiday.created_at), 'd MMM yyyy')}</p>
            </div>
            {holiday.decided_by && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  {holiday.status === 'approved' ? 'Approved by' : 'Decided by'}
                </p>
                <p className="text-gray-700">{profileMap[holiday.decided_by] ?? 'Unknown'}</p>
              </div>
            )}
          </div>

          {holiday.rejection_reason && (
            <div className="bg-red-50 rounded-lg px-3 py-2">
              <p className="text-xs text-red-500 font-medium mb-0.5">Rejection reason</p>
              <p className="text-sm text-red-700">{holiday.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager: approve / reject */}
      {canApprove && (
        <div className="flex gap-3">
          <Link
            href={`/holidays/${id}/approve`}
            className="flex-1 text-center py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Approve
          </Link>
          <Link
            href={`/holidays/${id}/reject`}
            className="flex-1 text-center py-3 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Reject
          </Link>
        </div>
      )}

      {/* Employee: withdraw pending request */}
      {canWithdraw && (
        <WithdrawHolidayButton holidayId={id} />
      )}
    </div>
  );
}
