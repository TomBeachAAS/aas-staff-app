import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';
import { EXPENSE_CATEGORY_LABELS, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

  const sp = await searchParams;
  const filter = sp.filter ?? 'mine';
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);

  let query = supabase
    .from('expenses')
    .select('*, user:profiles(full_name)')
    .order('claim_date', { ascending: false })
    .limit(50);

  if (filter === 'mine' || !isManagerOrAdmin) {
    query = query.eq('user_id', user.id);
  } else if (filter === 'submitted') {
    query = query.eq('status', 'submitted');
  } else if (filter === 'approved') {
    query = query.eq('status', 'approved');
  }

  const { data: expenses } = await query;

  const { count: submittedCount } = isManagerOrAdmin
    ? await supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
    : { count: null };

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Expenses</h2>
        <Link href="/expenses/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
          <Plus size={16} />
          New claim
        </Link>
      </div>

      {isManagerOrAdmin && (submittedCount ?? 0) > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">{submittedCount} expense{submittedCount !== 1 ? 's' : ''} awaiting approval</p>
          <Link href="/expenses?filter=submitted" className="text-xs text-amber-700 underline">Review</Link>
        </div>
      )}

      {isManagerOrAdmin && (
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'mine', label: 'Mine' },
            { key: 'submitted', label: 'Submitted' },
            { key: 'approved', label: 'Approved' },
          ].map(({ key, label }) => (
            <Link
              key={key}
              href={`/expenses?filter=${key}`}
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
            (expenses ?? []).map(e => {
              const user = e.user as {full_name: string} | undefined;
              return (
                <Link key={e.id} href={`/expenses/${e.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {isManagerOrAdmin && filter !== 'mine' && user && (
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">{user.full_name}</p>
                      )}
                      <p className="text-sm font-medium text-gray-800">{e.description}</p>
                      <p className="text-xs text-gray-400">
                        {EXPENSE_CATEGORY_LABELS[e.category]} · {format(new Date(e.claim_date), 'd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">£{Number(e.amount).toFixed(2)}</p>
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
