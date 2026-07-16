import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from 'date-fns';
import {
  Clock,
  Umbrella,
  AlertCircle,
  Briefcase,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

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

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');
  if (!isManagerOrAdmin) redirect('/dashboard');

  const today = new Date();
  const thisMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const thisMonthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  const lastMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  const lastMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  const thisYearStart = format(startOfYear(today), 'yyyy-MM-dd');
  const lastYearStart = format(startOfYear(subYears(today, 1)), 'yyyy-MM-dd');
  const lastYearEnd = format(endOfMonth(subMonths(startOfYear(today), 1)), 'yyyy-MM-dd');
  const todayStr = format(today, 'yyyy-MM-dd');

  const [
    // Holiday stats
    { data: pendingHolidays },
    { data: approvedThisYear },
    { data: staffOffToday },
    // Expense stats
    { data: expensesPendingRows },
    { data: expensesThisMonthRows },
    { data: expensesLastMonthRows },
    // Mileage stats
    { data: mileageThisMonthRows },
    // Task stats
    { count: overdueTaskCount },
    { count: completedTasksThisMonth },
    // Sickness
    { count: activeSicknessCount },
    // Jobs
    { count: openJobsCount },
    { count: completedJobsThisMonth },
    // Staff counts
    { count: totalStaff },
  ] = await Promise.all([
    supabase.from('holidays').select('id').eq('status', 'pending'),
    supabase.from('holidays').select('working_days').eq('status', 'approved').gte('start_date', thisYearStart).lte('end_date', thisMonthEnd),
    supabase.from('holidays').select('id').eq('status', 'approved').lte('start_date', todayStr).gte('end_date', todayStr),
    supabase.from('expenses').select('amount, currency').eq('status', 'submitted'),
    supabase.from('expenses').select('amount, currency').eq('status', 'approved').gte('claim_date', thisMonthStart).lte('claim_date', thisMonthEnd),
    supabase.from('expenses').select('amount, currency').eq('status', 'approved').gte('claim_date', lastMonthStart).lte('claim_date', lastMonthEnd),
    supabase.from('mileage_claims').select('calculated_amount').eq('status', 'approved').gte('claim_date', thisMonthStart).lte('claim_date', thisMonthEnd),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled")').lt('task_date', todayStr),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('task_date', thisMonthStart).lte('task_date', thisMonthEnd),
    supabase.from('sickness_records').select('*', { count: 'exact', head: true }).lte('start_date', todayStr).or(`end_date.is.null,end_date.gte.${todayStr}`),
    supabase.from('job_board').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('job_board').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', thisMonthStart + 'T00:00:00'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Aggregate pending expenses by currency
  const pendingByCurrency = (expensesPendingRows ?? []).reduce((acc: Record<string, number>, e: any) => {
    const c = e.currency ?? 'GBP';
    acc[c] = (acc[c] ?? 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);
  const hasPendingExpenses = Object.values(pendingByCurrency).some(v => v > 0);

  const expensesThisMonthGBP = (expensesThisMonthRows ?? [])
    .reduce((acc: Record<string, number>, e: any) => {
      const c = e.currency ?? 'GBP';
      acc[c] = (acc[c] ?? 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

  const expensesLastMonthGBP = (expensesLastMonthRows ?? [])
    .reduce((acc: Record<string, number>, e: any) => {
      const c = e.currency ?? 'GBP';
      acc[c] = (acc[c] ?? 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);

  const mileageThisMonth = (mileageThisMonthRows ?? [])
    .reduce((sum: number, m: any) => sum + Number(m.calculated_amount), 0);

  const approvedDaysThisYear = (approvedThisYear ?? [])
    .reduce((sum: number, h: any) => sum + Number(h.working_days ?? 0), 0);

  function formatCurrencyBreakdown(byCurrency: Record<string, number>) {
    return Object.entries(byCurrency)
      .map(([c, v]) => `${CURRENCY_SYMBOLS[c] ?? c}${v.toFixed(2)}`)
      .join(' + ') || '£0.00';
  }

  const monthLabel = format(today, 'MMMM yyyy');
  const lastMonthLabel = format(subMonths(today, 1), 'MMMM yyyy');

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Reports</h2>
        <p className="text-sm text-gray-500">Overview for {format(today, 'MMMM yyyy')}</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Timesheets', href: '/timesheets', icon: Clock, bg: 'bg-aas-blue', text: 'text-white' },
          { label: 'Holidays', href: '/holidays', icon: Umbrella, bg: 'bg-green-500', text: 'text-white' },
          { label: 'Sickness', href: '/sickness', icon: AlertCircle, bg: 'bg-red-500', text: 'text-white' },
          { label: 'Tasks', href: '/tasks', icon: FileText, bg: 'bg-violet-500', text: 'text-white' },
          { label: 'Jobs', href: '/jobs', icon: Briefcase, bg: 'bg-orange-500', text: 'text-white' },
          { label: 'Expenses', href: '/expenses', icon: TrendingUp, bg: 'bg-yellow-500', text: 'text-white' },
        ].map(({ label, href, icon: Icon, bg, text }) => (
          <Link
            key={href}
            href={href}
            className={`${bg} ${text} rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            <Icon size={22} />
            <span className="text-xs font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      {/* People */}
      <Card>
        <CardHeader><CardTitle>People</CardTitle></CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Row label="Active staff" value={String(totalStaff ?? 0)} />
          <Row label="Staff off today" value={String(staffOffToday?.length ?? 0)} highlight={!!staffOffToday?.length} />
          <Row label="Currently off sick" value={String(activeSicknessCount ?? 0)} highlight={!!activeSicknessCount} />
          <Row label="Pending holiday requests" value={String(pendingHolidays?.length ?? 0)} highlight={!!pendingHolidays?.length} />
          <Row label="Holiday days approved (this year)" value={String(approvedDaysThisYear)} />
        </CardContent>
      </Card>

      {/* Tasks & Jobs */}
      <Card>
        <CardHeader><CardTitle>Tasks &amp; Jobs</CardTitle></CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Row label="Overdue tasks" value={String(overdueTaskCount ?? 0)} highlight={!!overdueTaskCount} />
          <Row label={`Tasks completed (${monthLabel})`} value={String(completedTasksThisMonth ?? 0)} />
          <Row label="Open / in-progress jobs" value={String(openJobsCount ?? 0)} />
          <Row label={`Jobs completed (${monthLabel})`} value={String(completedJobsThisMonth ?? 0)} />
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Row
            label="Pending approval"
            value={formatCurrencyBreakdown(pendingByCurrency)}
            highlight={hasPendingExpenses}
          />
          <Row
            label={`Approved (${monthLabel})`}
            value={formatCurrencyBreakdown(expensesThisMonthGBP)}
          />
          <Row
            label={`Approved (${lastMonthLabel})`}
            value={formatCurrencyBreakdown(expensesLastMonthGBP)}
          />
          <Row
            label={`Mileage paid (${monthLabel})`}
            value={`£${mileageThisMonth.toFixed(2)}`}
          />
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          All figures are approximate and based on current data. Currency totals shown by currency code where mixed currencies are present.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? 'text-amber-600' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}
                                                                              