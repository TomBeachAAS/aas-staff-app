import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { getEffectiveUser } from '@/lib/effective-user';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/utils';
import { ExportPrintButton } from '@/components/expenses/ExportPrintButton';

export const dynamic = 'force-dynamic';

export default async function ExpenseExportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; user_id?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const { effectiveUserId, effectiveRole } = await getEffectiveUser(supabase, user.id, profile.role);
  const isManagerOrAdmin = ['administrator', 'manager'].includes(effectiveRole);

  const sp = await searchParams;
  const monthStr = sp.month ?? format(new Date(), 'yyyy-MM');

  let monthDate: Date;
  try {
    monthDate = parseISO(monthStr + '-01');
  } catch {
    monthDate = new Date();
  }

  const start = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const end = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  // If manager/admin and a specific user_id is requested, show that user's expenses
  const targetUserId = (isManagerOrAdmin && sp.user_id) ? sp.user_id : effectiveUserId;

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('claim_date', start)
    .lte('claim_date', end)
    .not('status', 'eq', 'draft')
    .order('claim_date');

  const { data: targetProfile } = targetUserId !== effectiveUserId
    ? await supabase.from('profiles').select('full_name').eq('id', targetUserId).single()
    : { data: profile };

  const employeeName = targetProfile?.full_name ?? profile.full_name;
  const monthLabel = format(monthDate, 'MMMM yyyy');
  const totalByCurrency: Record<string, number> = {};
  (expenses ?? []).forEach((e: any) => {
    const cur = e.currency ?? 'GBP';
    totalByCurrency[cur] = (totalByCurrency[cur] ?? 0) + Number(e.amount);
  });

  const currencySymbols: Record<string, string> = {
    GBP: 'GBP',
    DKK: 'DKK',
    EUR: 'EUR',
    USD: 'USD',
  };

  function formatAmount(amount: number, currency: string) {
    const sym = currencySymbols[currency] ?? currency;
    return sym + ' ' + amount.toFixed(2);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Controls — hidden when printing */}
      <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/expenses" className="text-sm text-gray-500 hover:text-gray-800">← Back</a>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-800">Expense Export — {monthLabel}</h1>
        </div>
        <div className="flex items-center gap-3">
          <form method="GET" className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={monthStr}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
            />
            {sp.user_id && <input type="hidden" name="user_id" value={sp.user_id} />}
            <button type="submit" className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">
              Load
            </button>
          </form>
          <ExportPrintButton />
        </div>
      </div>

      {(expenses ?? []).length === 0 ? (
        <div className="print:hidden flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">No submitted expenses for {monthLabel}</p>
        </div>
      ) : (
        <div>
          {(expenses ?? []).map((e: any, idx: number) => (
            <div
              key={e.id}
              className="p-10 break-after-page"
              style={{ minHeight: '90vh', pageBreakAfter: 'always' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Expense Claim</h2>
                  <p className="text-gray-500 mt-1">{monthLabel} · Claim {idx + 1} of {(expenses ?? []).length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Autonomous Agri Solutions</p>
                  <p className="text-xs text-gray-400">aas-staff-app.vercel.app</p>
                </div>
              </div>

              {/* Employee */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Employee</p>
                <p className="text-lg font-semibold text-gray-900">{employeeName}</p>
              </div>

              {/* Expense details */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 mb-8">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Date</p>
                  <p className="text-base font-medium text-gray-900">{format(new Date(e.claim_date), 'd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-base font-medium text-gray-900">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(Number(e.amount), e.currency ?? 'GBP')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <p className="text-base font-medium text-gray-900 capitalize">{e.status}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-base text-gray-900">{e.description}</p>
                </div>
                {e.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{e.notes}</p>
                  </div>
                )}
              </div>

              {/* Receipt */}
              {e.receipt_url && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Receipt</p>
                  <img
                    src={e.receipt_url}
                    alt="Receipt"
                    className="max-w-sm max-h-64 object-contain border border-gray-200 rounded-lg"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="mt-auto pt-8 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>Printed on {format(new Date(), 'd MMM yyyy')}</span>
                <span>Claim ID: {e.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          ))}

          {/* Summary page */}
          <div className="p-10 print:break-before-page">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Monthly Summary</h2>
            <p className="text-gray-500 mb-6">{employeeName} · {monthLabel}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="text-left py-2 text-xs text-gray-400 uppercase tracking-wide">Description</th>
                  <th className="text-left py-2 text-xs text-gray-400 uppercase tracking-wide">Category</th>
                  <th className="text-right py-2 text-xs text-gray-400 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(expenses ?? []).map((e: any) => (
                  <tr key={e.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{format(new Date(e.claim_date), 'd MMM')}</td>
                    <td className="py-2 text-gray-800">{e.description}</td>
                    <td className="py-2 text-gray-600">{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatAmount(Number(e.amount), e.currency ?? 'GBP')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {Object.entries(totalByCurrency).map(([cur, total]) => (
                  <tr key={cur}>
                    <td colSpan={3} className="pt-4 text-xs font-bold text-gray-500 uppercase tracking-wide">Total ({cur})</td>
                    <td className="pt-4 text-right text-lg font-bold text-gray-900">{formatAmount(total, cur)}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
