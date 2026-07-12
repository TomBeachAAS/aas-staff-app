import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, Umbrella } from 'lucide-react';
import { HolidayStatusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { getLeaveYear } from '@/lib/utils';
import { HolidayYearSelector } from '@/components/holidays/HolidayYearSelector';

export const dynamic = 'force-dynamic';

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; year?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !profile.holiday_access) redirect('/dashboard');

  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const leaveYear = parseInt(sp.year ?? String(getLeaveYear()));
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);

  // Balance
  const { data: balanceRows } = await supabase.rpc('get_holiday_balance', {
    p_user_id: user.id,
    p_leave_year: leaveYear,
  });
  const balance = balanceRows?.[0];

  // Holidays — no profile joins to avoid FK ambiguity
  let query = supabase
    .from('holidays')
    .select('*')
    .order('start_date', { ascending: false });

  if (!isManagerOrAdmin || filter !== 'pending') {
    query = query.eq('user_id', user.id);
  }
  if (filter === 'pending') {
    query = query.eq('status', 'pending');
  }

  const { data: holidays } = await query.limit(50);

  // Fetch profiles for user_id and decided_by separately
  const allUserIds = [...new Set([
    ...(holidays ?? []).map((h: any) => h.user_id).filter(Boolean),
    ...(holidays ?? []).map((h: any) => h.decided_by).filter(Boolean),
  ])];
  const { data: profileRows } = allUserIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map(p => [p.id, p.full_name]));

  // Bank holidays for the period
  const { data: bankHolidays } = await supabase
    .from('bank_holidays')
    .select('*')
    .gte('date', `${leaveYear}-04-01`)
    .lte('date', `${leaveYear + 1}-03-31`)
    .order('date');

  // Pending count for managers
  let pendingCount = 0;
  if (isManagerOrAdmin) {
    const { count } = await supabase
      .from('holidays')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingCount = count ?? 0;
  }

  const leaveYearLabel = `${leaveYear} / ${leaveYear + 1}`;
  const yearOptions = [-1, 0, 1].map(o => getLeaveYear() + o);

  return (
    <div className="p-4 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Holiday</h2>
        <Link
          href="/holidays/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors"
        >
          <Plus size={16} />
          Request
        </Link>
      </div>

      {/* Balance */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Remaining" value={balance?.remaining ?? '—'} icon={Umbrella} />
        <StatCard label="Used" value={balance?.used ?? 0} icon={Umbrella} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard label="Pending" value={balance?.pending ?? 0} icon={Umbrella} iconColor="text-amber-600" iconBg="bg-amber-50" />
      </div>
      <p className="text-xs text-gray-400 text-center">
        Leave year {leaveYearLabel} — allowance: {balance?.allowance ?? 20} days
        {(balance?.adjustments ?? 0) !== 0 && ` (adjusted ${balance?.adjustments! > 0 ? '+' : ''}${balance?.adjustments})`}
      </p>

      {/* Manager: pending approvals banner */}
      {isManagerOrAdmin && pendingCount > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            {pendingCount} holiday {pendingCount === 1 ? 'request' : 'requests'} awaiting approval
          </p>
          <Link href="/holidays?filter=pending" className="text-xs text-amber-700 underline">Review</Link>
        </div>
      )}

      {/* Pending approval list */}
      {isManagerOrAdmin && filter === 'pending' && (
        <Card>
          <CardHeader><CardTitle>Pending approval requests</CardTitle></CardHeader>
          <div className="divide-y divide-gray-50">
            {(holidays ?? []).filter((h: any) => h.status === 'pending').length === 0 ? (
              <CardContent><p className="text-sm text-gray-400 text-center py-4">No pending requests</p></CardContent>
            ) : (holidays ?? []).filter((h: any) => h.status === 'pending').map((h: any) => (
              <div key={h.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {profileMap[h.user_id] ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {format(new Date(h.start_date), 'd MMM')} – {format(new Date(h.end_date), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-400">{h.working_days} {h.working_days === 1 ? 'day' : 'days'}</p>
                    {h.notes && <p className="text-xs text-gray-500 mt-1 italic">"{h.notes}"</p>}
                  </div>
                  <HolidayStatusBadge status={h.status} />
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/holidays/${h.id}/approve`}
                    className="flex-1 text-center py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </Link>
                  <Link
                    href={`/holidays/${h.id}/reject`}
                    className="flex-1 text-center py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My holiday list */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>My holiday requests</CardTitle>
          <HolidayYearSelector currentYear={leaveYear} options={yearOptions} />
        </CardHeader>
        {(holidays ?? []).filter((h: any) => isManagerOrAdmin ? h.user_id === user.id : true).length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-6">No holiday requests for this leave year</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-50">
            {(holidays ?? []).filter((h: any) => !isManagerOrAdmin || h.user_id === user.id).map((h: any) => (
              <Link key={h.id} href={`/holidays/${h.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {format(new Date(h.start_date), 'd MMM')} – {format(new Date(h.end_date), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-500">{h.working_days} {h.working_days === 1 ? 'day' : 'days'}</p>
                    {h.rejection_reason && (
                      <p className="text-xs text-red-500 mt-0.5">Reason: {h.rejection_reason}</p>
                    )}
                    {h.decided_by && h.status !== 'pending' && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.status === 'approved' ? 'Approved' : 'Decided'} by {profileMap[h.decided_by] ?? 'Unknown'}
                      </p>
                    )}
                  </div>
                  <HolidayStatusBadge status={h.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Bank holidays */}
      <Card>
        <CardHeader><CardTitle>Bank holidays {leaveYearLabel}</CardTitle></CardHeader>
        <div className="divide-y divide-gray-50">
          {(bankHolidays ?? []).map((bh: any) => (
            <div key={bh.id} className="px-4 py-2.5 flex items-center justify-between">
              <p className="text-sm text-gray-700">{bh.name}</p>
              <p className="text-xs text-gray-400">{format(new Date(bh.date), 'EEE d MMM yyyy')}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
