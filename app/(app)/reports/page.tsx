import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard');

  const reports = [
    { key: 'working-hours', label: 'Working hours by employee', description: 'Total hours worked per person for the selected month' },
    { key: 'holiday', label: 'Holiday allowance & usage', description: 'Days taken, remaining and pending per employee' },
    { key: 'sickness', label: 'Sickness absence', description: 'Sickness records for the selected period' },
    { key: 'expenses', label: 'Expenses by employee', description: 'Expense claims with totals per person' },
    { key: 'expense-categories', label: 'Expense category totals', description: 'Total spend broken down by category' },
    { key: 'mileage', label: 'Personal mileage', description: 'Mileage claims and totals per employee' },
    { key: 'tasks', label: 'Task completion', description: 'Tasks created, completed and overdue' },
    { key: 'availability', label: 'Staff availability', description: 'Who is available, on leave or absent' },
    { key: 'overdue-tasks', label: 'Overdue tasks', description: 'All tasks past their due date' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <BarChart3 size={20} className="text-aas-blue" />
        <h2 className="text-lg font-bold text-gray-800">Reports</h2>
      </div>
      <p className="text-sm text-gray-500">All reports export to Excel (.xlsx) and cover up to 5 years of data.</p>

      <div className="space-y-2">
        {reports.map(r => (
          <div key={r.key} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.label}</p>
              <p className="text-xs text-gray-400">{r.description}</p>
            </div>
            <Link
              href={`/api/reports/${r.key}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-aas-blue-pale text-aas-blue rounded-lg text-xs font-medium hover:bg-aas-blue hover:text-white transition-colors shrink-0"
            >
              <Download size={13} />
              Export
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
