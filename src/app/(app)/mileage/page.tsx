import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function MileagePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const sp = await searchParams;
  const filter = sp.filter ?? 'mine';
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);

  const { data: rateRow } = await supabase
    .from('company_settings').select('value').eq('key', 'mileage_rate_per_mile').single();
  const rate = parseFloat(rateRow?.value ?? '0.45');

  let query = supabase.from('mileage_claims').select('*').order('claim_date', { ascending: false }).limit(100);

  if (!isManagerOrAdmin || filter === 'mine') {
    query = query.eq('user_id', user.id);
  } else if (filter === 'submitted') {
    query = query.eq('status', 'submitted');
  } else if (filter === 'approved') {
    query = query.eq('status', 'approved');
  }
  // 'all' — no extra filter (managers only)

  const { data: claims } = await query;

  const userIds = [...new Set((claims ?? []).map((c: any) => c.user_id))];
  const { data: claimProfiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((claimProfiles ?? []).map((p: any) => [p.id, p.full_name]));

  const { count: submittedCount } = isManagerOrAdmin
    ? await supabase.from('mileage_claims').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
    : { count: null };

  const totalOwed = (claims ?? [])
    .filter((c: any) => c.status === 'approved' && filter === 'mine')
    .reduce((sum: number, c: any) => sum + Number(c.calculated_amount), 0);

  const managerTabs = [
    { key: 'mine',      label: 'Mine' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved',  label: 'Approved' },
    { key: 'all',       label: 'All' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Mileage</h2>
        <Link href="/mileage/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
          <Plus size={16} />
          New claim
        </Link>
      </div>

      <div className="bg-aas-blue-pale rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-aas-blue font-medium">Company rate</p>
          <p className="text-sm font-bold text-aas-blue-dark">£{rate.toFixed(2)} per mile</p>
        </div>
        {totalOwed > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Approved (unpaid)</p>
            <p className="text-sm font-bold text-gray-800">£{totalOwed.toFixed(2)}</p>
          </div>
        )}
      </div>

      {isManagerOrAdmin && (submittedCount ?? 0) > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            {submittedCount} mileage claim{submittedCount !== 1 ? 's' : ''} awaiting approval
          </p>
          <Link href="/mileage?filter=submitted" className="text-xs text-amber-700 underline">Review</Link>
        </div>
      )}

      {isManagerOrAdmin && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {managerTabs.map(({ key, label }) => (
            <Link
              key={key}
              href={'/mileage?filter=' + key}
              className={cn(
                'flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-colors',
                filter === key ? 'bg-white text-aas-blue shadow-sm' : 'text-gray-500'
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <Card>
        <div className="divide-y divide-gray-50">
          {(claims ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No mileage claims</div>
          ) : (
            (claims ?? []).map((c: any) => {
              const ownerName = profileMap[c.user_id] ?? '';
              const showOwner = isManagerOrAdmin && filter !== 'mine' && ownerName;
              return (
                <Link key={c.id} href={'/mileage/' + c.id} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {showOwner && (
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{ownerName}</p>
                      )}
                      <p className="text-sm font-medium text-gray-800">{c.from_location} → {c.to_location}</p>
                      <p className="text-xs text-gray-400">{c.business_reason}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(c.claim_date), 'd MMM yyyy')} · {Number(c.distance_miles).toFixed(1)} miles
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">£{Number(c.calculated_amount).toFixed(2)}</p>
                      <ExpenseStatusBadge status={c.status} />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
