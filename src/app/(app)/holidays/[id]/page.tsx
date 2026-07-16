import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { HolidayStatusBadge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { HolidayActions } from '@/components/holidays/HolidayActions';

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

  const { data: holiday } = await supabase
    .from('holidays')
    .select('*')
    .eq('id', id)
    .single();

  if (!holiday) redirect('/holidays');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isOwner = holiday.user_id === user.id;

  if (!isOwner && !isManagerOrAdmin) redirect('/holidays');

  // Fetch owner and decider names in one query
  const userIds = [...new Set([holiday.user_id, holiday.decided_by].filter(Boolean))];
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p.full_name]));

  const ownerName = profileMap[holiday.user_id] ?? 'Unknown';
  const deciderName = holiday.decided_by ? profileMap[holiday.decided_by] : null;

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
            <div>
              {isManagerOrAdmin && !isOwner && (
                <p className="text-sm font-semibold text-aas-blue mb-1">{ownerName}</p>
              )}
              <p className="text-xl font-bold text-gray-900">
                {format(new Date(holiday.start_date), 'd MMM')} – {format(new Date(holiday.end_date), 'd MMM yyyy')}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {holiday.working_days} working {holiday.working_days === 1 ? 'day' : 'days'}
              </p>
            </div>
            <HolidayStatusBadge status={holiday.status} />
          </div>

          {holiday.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700 italic">&ldquo;{holiday.notes}&rdquo;</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm pt-2 border-t border-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Submitted</p>
              <p className="text-gray-700">{format(new Date(holiday.created_at), 'd MMM yyyy')}</p>
            </div>
            {holiday.leave_year && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Leave year</p>
                <p className="text-gray-700">{holiday.leave_year} / {holiday.leave_year + 1}</p>
              </div>
            )}
            {deciderName && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  {holiday.status === 'approved' ? 'Approved by' : 'Decided by'}
                </p>
                <p className="text-gray-700">{deciderName}</p>
              </div>
            )}
            {holiday.decided_at && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Decision date</p>
                <p className="text-gray-700">{format(new Date(holiday.decided_at), 'd MMM yyyy')}</p>
              </div>
            )}
          </div>

          {holiday.rejection_reason && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-500 font-medium mb-0.5">Rejection reason</p>
              <p className="text-sm text-red-700">{holiday.rejection_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager: approve / reject buttons */}
      {isManagerOrAdmin && holiday.status === 'pending' && (
        <div className="flex gap-3">
          <Link
            href={`/holidays/${id}/approve`}
            className="flex-1 text-center py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            Approve
          </Link>
          <Link
            href={`/holidays/${id}/approve`}
            className="flex-1 text-center py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Reject
          </Link>
        </div>
      )}

      {/* Owner: withdraw pending request */}
      <HolidayActions holidayId={id} status={holiday.status} isOwner={isOwner} />
    </div>
  );
}
