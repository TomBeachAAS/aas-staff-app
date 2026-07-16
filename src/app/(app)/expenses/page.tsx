import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';
import { EXPENSE_CATEGORY_LABELS, cn } from '@/lib/utils';
import { getEffectiveUser } from '@/lib/effective-user';

export const dynamic = 'force-dynamic';

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  EUR: '€',
  USD: '$',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'Fr',
};

function formatAmount(amount: number, currency?: string | null): string {
  const code = currency ?? 'GBP';
  const symbol = CURRENCY_SYMBOLS[code] ?? code + ' ';
  return `${symbol}${amount.toFixed(2)}`;
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const { effectiveUserId, effectiveRole } = await getEffectiveUser(supabase, user.id, profile.role);
  const isManagerOrAdmin = ['administrator', 'manager'].includes(effectiveRole);

  const sp = await searchParams;
  const filter = sp.filter ?? 'mine';

  let query = supabase
    .from('expenses')
    .select('*')
    .order('claim_date', { ascending: false })
    .limit(100);

  if (!isManagerOrAdmin) {
    query = query.eq('user_id', effectiveUserId);
  } else {
    if (filter === 'mine') {
      query = query.eq('user_id', effectiveUserId);
    } else if (filter === 'pending') {
      query = query.eq('status', 'submitted');
    } else if (filter === 'approved') {
      query = query.eq('status', 'approved');
    }
    // 'all' — no extra filter
  }

  const { data: expenses } = await query;

  const userIds = [...new Set((expenses ?? []).map((e: any) => e.user_id))];
  const { data: expenseProfiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((expenseProfiles ?? []).map((p: any) => [p.id, p.full_name]));

  const { count: pendingCount } = isManagerOrAdmin
    ? await supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
    : { count: null };

  const managerTabs = [
    { key: 'mine',     label: 'Mine' },
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Expenses</h2>
        <Link href="/expenses/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
          <Plus size={16} />
          New claim
        </Link>
      </div>

      {isManagerOrAdmin && (pendingCount ?? 0) > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">
            {pendingCount} expense{pendingCount !== 1 ? 's' : ''} awaiting approval
          </p>
          <Link href="/expenses?filter=pending" className="text-xs text-amber-700 underline">Review</Link>
        </div>
      )}

      {isManagerOrAdmin && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {managerTabs.map(({ key, label }) => (
            <Link
              key={key}
              href={'/expenses?filter=' + key}
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
          {(expenses ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No expense claims</div>
          ) : (
            (expenses ?? []).map((e: any) => {
              const ownerName = profileMap[e.user_id] ?? '';
              const showOwner = isManagerOrAdmin && filter !== 'mine' && ownerName && e.user_id !== effectiveUserId;
              const isNonGBP = e.currency && e.currency !== 'GBP';
              return (
                <Link key={e.id} href={'/expenses/' + e.id} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {showOwner && (
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{ownerName}</p>
                      )}
                      <p className="text-sm font-medium text-gray-800 truncate">{e.description}</p>
                      <p className="text-xs text-gray-400">
                        {EXPENSE_CATEGORY_LABELS[e.category]} · {format(new Date(e.claim_date), 'd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {formatAmount(Number(e.amount), e.currency)}
                        {isNonGBP && (
                          <span className="ml-1 text-xs font-normal text-gray-400">{e.currency}</span>
                        )}
                      </p>
                      <ExpenseStatusBadge status={e.status} />
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
