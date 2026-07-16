import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Receipt } from 'lucide-react';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';
import { ExpenseActions } from '@/components/expenses/ExpenseActions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';

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

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const { data: expense, error } = await supabase
    .from('expenses')
    .select('*, owner:profiles!expenses_user_id_fkey(full_name)')
    .eq('id', id)
    .single();

  if (error || !expense) redirect('/expenses');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isOwner = expense.user_id === user.id;
  if (!isOwner && !isManagerOrAdmin) redirect('/expenses');

  const ownerName = (expense.owner as { full_name: string } | null)?.full_name ?? '';
  const currencyCode = expense.currency ?? 'GBP';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode + ' ';
  const formattedAmount = `${currencySymbol}${Number(expense.amount).toFixed(2)}`;

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/expenses" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Expense claim</h2>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-800">{expense.description}</p>
              {isManagerOrAdmin && !isOwner && ownerName && (
                <p className="text-xs text-gray-500 mt-0.5">{ownerName}</p>
              )}
            </div>
            <ExpenseStatusBadge status={expense.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Amount</p>
              <p className="font-bold text-gray-800 text-lg">{formattedAmount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Currency</p>
              <p className="text-gray-700">{currencyCode}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-gray-700">{format(new Date(expense.claim_date), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Category</p>
              <p className="text-gray-700">{EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category}</p>
            </div>
          </div>

          {expense.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700">{expense.notes}</p>
            </div>
          )}

          {expense.reviewed_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Reviewed</p>
              <p className="text-sm text-gray-500">{format(new Date(expense.reviewed_at), 'd MMM yyyy, HH:mm')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {expense.receipt_url ? (
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={expense.receipt_url} alt="Receipt" className="w-full rounded-lg border border-gray-100 object-contain max-h-72 bg-gray-50" />
              <p className="text-xs text-aas-blue mt-2 text-center">Tap to open full size</p>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-400 px-1">
          <Receipt size={14} />
          <span>No receipt attached</span>
        </div>
      )}

      <ExpenseActions
        expenseId={expense.id}
        status={expense.status}
        isOwner={isOwner}
        isManagerOrAdmin={isManagerOrAdmin}
        managerNotes={expense.manager_notes ?? null}
      />
    </div>
  );
}
