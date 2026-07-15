'use client';

import { useState, useEffect, useCallback, type ElementType } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfYear,
  subMonths,
} from 'date-fns';
import {
  Clock, Umbrella, AlertCircle, CheckSquare,
  Briefcase, Receipt, Download, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLeaveYear } from '@/lib/utils';

type DatePreset = 'month' | 'last_month' | 'year' | 'custom';

interface EmployeeMetrics {
  userId: string;
  name: string;
  role: string;
  initials: string;
  hoursLogged: number;
  holidayDays: number;
  sickDays: number;
  tasksCompleted: number;
  tasksTotal: number;
  jobsCompleted: number;
  expensesCount: number;
  expensesTotal: number;
  holidayAllowance: number | null;
  holidayUsed: number | null;
  holidayBalance: number | null;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

/** Count working days (Mon–Fri) between two dates, clamped to the report range */
function workingDaysInRange(
  start_date: string,
  end_date: string | null,
  rangeStart: string,
  rangeEnd: string
): number {
  const s = new Date(Math.max(new Date(start_date).getTime(), new Date(rangeStart).getTime()));
  const e = new Date(Math.min(
    (end_date ? new Date(end_date) : new Date()).getTime(),
    new Date(rangeEnd).getTime()
  ));
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function ReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [preset, setPreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(today);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<EmployeeMetrics[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sortKey, setSortKey] = useState<keyof EmployeeMetrics>('name');
  const [sortAsc, setSortAsc] = useState(true);

  function getDateRange(): { start: string; end: string; label: string } {
    const now = new Date();
    if (preset === 'month') return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
      label: format(now, 'MMMM yyyy'),
    };
    if (preset === 'last_month') {
      const lm = subMonths(now, 1);
      return {
        start: format(startOfMonth(lm), 'yyyy-MM-dd'),
        end: format(endOfMonth(lm), 'yyyy-MM-dd'),
        label: format(lm, 'MMMM yyyy'),
      };
    }
    if (preset === 'year') return {
      start: format(startOfYear(now), 'yyyy-MM-dd'),
      end: today,
      label: `${now.getFullYear()} YTD`,
    };
    return { start: customStart, end: customEnd, label: `${customStart} to ${customEnd}` };
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const manager = ['administrator', 'manager'].includes(p?.role ?? '');
    setIsManager(manager);

    const [
      { data: staffData },
      { data: timesheets },
      { data: holidays },
      { data: sickness },
      { data: tasks },
      { data: taskAssignees },
      { data: jobs },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('profiles').select('id, full_name, role').eq('status', 'active').order('full_name'),
      supabase.from('timesheet_entries').select('user_id, start_time, end_time').gte('work_date', start).lte('work_date', end),
      supabase.from('holidays').select('user_id, start_date, end_date, working_days').eq('status', 'approved').lte('start_date', end).gte('end_date', start),
      supabase.from('sickness_records').select('user_id, start_date, end_date').lte('start_date', end).or(`end_date.is.null,end_date.gte.${start}`),
      supabase.from('tasks').select('id, status, task_date').gte('task_date', start).lte('task_date', end),
      supabase.from('task_assignees').select('task_id, user_id'),
      supabase.from('job_board').select('completed_by').eq('status', 'completed').gte('completed_at', `${start}T00:00:00`).lte('completed_at', `${end}T23:59:59`),
      supabase.from('expenses').select('user_id, amount').gte('created_at', `${start}T00:00:00`).lte('created_at', `${end}T23:59:59`),
    ]);

    const staff = manager
      ? (staffData ?? [])
      : (staffData ?? []).filter((s: any) => s.id === user.id);

    const leaveYear = getLeaveYear();
    const balances = await Promise.all(
      staff.map((s: any) =>
        supabase.rpc('get_holiday_balance', { p_user_id: s.id, p_leave_year: leaveYear })
      )
    );

    // Build a map: task_id -> set of user_ids who are assignees
    const assigneeMap = new Map<string, Set<string>>();
    for (const a of (taskAssignees ?? [])) {
      if (!assigneeMap.has(a.task_id)) assigneeMap.set(a.task_id, new Set());
      assigneeMap.get(a.task_id)!.add(a.user_id);
    }

    const result: EmployeeMetrics[] = staff.map((member: any, i: number) => {
      const uid = member.id;
      const hours = (timesheets ?? [])
        .filter((t: any) => t.user_id === uid)
        .reduce((sum: number, t: any) => {
          if (!t.start_time || !t.end_time) return sum;
          const [sh, sm] = (t.start_time as string).split(':').map(Number);
          const [eh, em] = (t.end_time as string).split(':').map(Number);
          const gross = (eh * 60 + em) - (sh * 60 + sm);
          const net = Math.max(0, gross - 60);
          return sum + (net > 0 ? net / 60 : 0);
        }, 0);

      const holDays = (holidays ?? [])
        .filter((h: any) => h.user_id === uid)
        .reduce((sum: number, h: any) => sum + (h.working_days ?? 0), 0);

      // Use working days (Mon–Fri) for sick day count
      const sickDays = (sickness ?? [])
        .filter((s: any) => s.user_id === uid)
        .reduce((sum: number, s: any) => sum + workingDaysInRange(s.start_date, s.end_date, start, end), 0);

      // Count tasks where user is an assignee (not just creator)
      const myTasks = (tasks ?? []).filter((t: any) =>
        assigneeMap.get(t.id)?.has(uid)
      );
      const tasksCompleted = myTasks.filter((t: any) => t.status === 'completed').length;

      const jobsDone = (jobs ?? []).filter((j: any) => j.completed_by === uid).length;
      const myExpenses = (expenses ?? []).filter((e: any) => e.user_id === uid);
      const expTotal = myExpenses.reduce((sum: number, e: any) => sum + (e.amount ?? 0), 0);
      const bal = balances[i]?.data?.[0];

      return {
        userId: uid,
        name: member.full_name,
        role: member.role,
        initials: member.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        hoursLogged: Math.round(hours * 10) / 10,
        holidayDays: holDays,
        sickDays,
        tasksCompleted,
        tasksTotal: myTasks.length,
        jobsCompleted: jobsDone,
        expensesCount: myExpenses.length,
        expensesTotal: Math.round(expTotal * 100) / 100,
        holidayAllowance: bal?.allowance ?? null,
        holidayUsed: bal?.used ?? null,
        holidayBalance: bal?.remaining ?? null,
      };
    });

    setMetrics(result);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  function toggleSort(key: keyof EmployeeMetrics) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...metrics].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
    return sortAsc
      ? String(av ?? '').localeCompare(String(bv ?? ''))
      : String(bv ?? '').localeCompare(String(av ?? ''));
  });

  async function exportExcel() {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const { label } = getDateRange();
      const rows = metrics.map(m => ({
        'Employee': m.name,
        'Role': m.role.replace(/_/g, ' '),
        'Hours Logged': m.hoursLogged,
        'Holiday Days Taken': m.holidayDays,
        'Sick Days (working)': m.sickDays,
        'Tasks Completed': m.tasksCompleted,
        'Total Tasks': m.tasksTotal,
        'Task Completion %': m.tasksTotal > 0 ? Math.round((m.tasksCompleted / m.tasksTotal) * 100) : 0,
        'Jobs Completed': m.jobsCompleted,
        'Expenses (count)': m.expensesCount,
        'Expenses (£)': m.expensesTotal,
        'Holiday Allowance': m.holidayAllowance ?? '',
        'Holiday Used': m.holidayUsed ?? '',
        'Holiday Remaining': m.holidayBalance ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
        { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
        { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Staff Report');
      XLSX.writeFile(wb, `aas-staff-report-${label.replace(/[^a-z0-9]/gi, '-')}.xlsx`);
    } catch {
      alert('Excel export requires the xlsx package.\n\nRun in your project: npm install xlsx');
    }
    setExporting(false);
  }

  const { label } = getDateRange();
  const totals = metrics.reduce((acc, m) => ({
    hours: acc.hours + m.hoursLogged,
    holiday: acc.holiday + m.holidayDays,
    sick: acc.sick + m.sickDays,
    tasks: acc.tasks + m.tasksCompleted,
    jobs: acc.jobs + m.jobsCompleted,
    expenses: acc.expenses + m.expensesTotal,
  }), { hours: 0, holiday: 0, sick: 0, tasks: 0, jobs: 0, expenses: 0 });

  const maxHours = Math.max(...metrics.map(m => m.hoursLogged), 1);
  const maxHol = Math.max(...metrics.map(m => m.holidayDays), 1);
  const maxSick = Math.max(...metrics.map(m => m.sickDays), 1);
  const maxTasks = Math.max(...metrics.map(m => m.tasksCompleted), 1);
  const maxJobs = Math.max(...metrics.map(m => m.jobsCompleted), 1);

  return (
    <div className="p-4 space-y-5 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Reports</h2>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={exporting || loading || metrics.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Download size={15} />
          {exporting ? 'Exporting…' : 'Export to Excel'}
        </button>
      </div>

      {/* Date range selector */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              preset === p.key
                ? 'bg-aas-blue text-white border-aas-blue'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aas-blue"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-aas-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards — managers only */}
          {isManager && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <SummaryCard icon={Clock} label="Total Hours" value={`${totals.hours.toFixed(1)}h`} bg="bg-aas-blue" />
              <SummaryCard icon={Umbrella} label="Holiday Days" value={`${totals.holiday}d`} bg="bg-green-500" />
              <SummaryCard icon={AlertCircle} label="Sick Days" value={`${totals.sick}d`} bg="bg-red-500" />
              <SummaryCard icon={CheckSquare} label="Tasks Done" value={`${totals.tasks}`} bg="bg-violet-500" />
              <SummaryCard icon={Briefcase} label="Jobs Done" value={`${totals.jobs}`} bg="bg-orange-500" />
              <SummaryCard icon={Receipt} label="Expenses" value={`£${totals.expenses.toFixed(2)}`} bg="bg-yellow-500" />
            </div>
          )}

          {/* Sort bar */}
          {isManager && metrics.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
              <span className="shrink-0">Sort by:</span>
              {([
                { key: 'name', label: 'Name' },
                { key: 'hoursLogged', label: 'Hours' },
                { key: 'holidayDays', label: 'Holiday' },
                { key: 'sickDays', label: 'Sick' },
                { key: 'tasksCompleted', label: 'Tasks' },
                { key: 'jobsCompleted', label: 'Jobs' },
              ] as { key: keyof EmployeeMetrics; label: string }[]).map(opt => (
                <button
                  key={String(opt.key)}
                  onClick={() => toggleSort(opt.key)}
                  className={`px-2.5 py-1 rounded-full border transition-colors ${
                    sortKey === opt.key
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {opt.label}{sortKey === opt.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              ))}
            </div>
          )}

          {/* Employee cards */}
          <div className="space-y-3">
            {sorted.map(m => (
              <EmployeeCard
                key={m.userId}
                m={m}
                maxHours={maxHours}
                maxHol={maxHol}
                maxSick={maxSick}
                maxTasks={maxTasks}
                maxJobs={maxJobs}
                isManager={isManager}
              />
            ))}
            {metrics.length === 0 && (
              <div className="text-center py-12 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                No data for this period
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function SummaryCard({ icon: Icon, label, value, bg }: {
  icon: ElementType; label: string; value: string; bg: string;
}) {
  return (
    <div className={`rounded-xl p-4 flex items-center gap-3 ${bg} text-white`}>
      <Icon size={20} className="shrink-0 opacity-90" />
      <div>
        <p className="text-xs opacity-80">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function MetricBar({ label, value, display, max, color, warn }: {
  label: string; value: number; display: string; max: number; color: string; warn?: boolean;
}) {
  const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-16 text-right shrink-0 ${warn && value > 0 ? 'text-red-500' : 'text-gray-600'}`}>
        {display}
      </span>
    </div>
  );
}

function DetailStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-red-500' : 'text-gray-700'}`}>{value}</p>
    </div>
  );
}

function EmployeeCard({ m, maxHours, maxHol, maxSick, maxTasks, maxJobs, isManager }: {
  m: EmployeeMetrics;
  maxHours: number; maxHol: number; maxSick: number; maxTasks: number; maxJobs: number;
  isManager: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const taskPct = m.tasksTotal > 0 ? Math.round((m.tasksCompleted / m.tasksTotal) * 100) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full bg-aas-blue flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">{m.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
          <p className="text-xs text-gray-400 capitalize">{m.role.replace(/_/g, ' ')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
          {m.hoursLogged > 0 && <span className="font-semibold text-aas-blue">{m.hoursLogged}h</span>}
          {m.holidayDays > 0 && <span className="text-green-600">{m.holidayDays}d leave</span>}
          {m.sickDays > 0 && <span className="text-red-500">{m.sickDays}d sick</span>}
          {taskPct !== null && <span className="text-violet-600">{taskPct}% tasks</span>}
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Metric bars */}
      <div className="px-4 pb-3 space-y-2">
        <MetricBar label="Hours logged" value={m.hoursLogged} display={`${m.hoursLogged}h`} max={maxHours} color="bg-aas-blue" />
        <MetricBar label="Holiday taken" value={m.holidayDays} display={`${m.holidayDays}d`} max={maxHol} color="bg-green-500" />
        <MetricBar label="Sick days (working)" value={m.sickDays} display={`${m.sickDays}d`} max={Math.max(maxSick,1)} color="bg-red-400" warn={m.sickDays > 0} />
        <MetricBar label="Tasks completed" value={m.tasksCompleted} display={`${m.tasksCompleted}/${m.tasksTotal}`} max={maxTasks} color="bg-violet-500" />
        <MetricBar label="Jobs completed" value={m.jobsCompleted} display={`${m.jobsCompleted}`} max={Math.max(maxJobs,1)} color="bg-orange-400" />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <DetailStat label="Holiday allowance" value={m.holidayAllowance != null ? `${m.holidayAllowance} days` : '—'} />
            <DetailStat label="Holiday used" value={m.holidayUsed != null ? `${m.holidayUsed} days` : '—'} />
            <DetailStat
              label="Holiday remaining"
              value={m.holidayBalance != null ? `${m.holidayBalance} days` : '—'}
              highlight={m.holidayBalance != null && m.holidayBalance <= 5}
            />
            <DetailStat label="Expenses submitted" value={`${m.expensesCount} claim${m.expensesCount !== 1 ? 's' : ''}`} />
            <DetailStat label="Expenses value" value={`£${m.expensesTotal.toFixed(2)}`} />
            <DetailStat label="Task completion" value={taskPct !== null ? `${taskPct}%` : '—'} />
          </div>

          {/* Holiday balance bar */}
          {m.holidayAllowance != null && m.holidayAllowance > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Holiday allowance used</span>
                <span>{m.holidayUsed ?? 0} of {m.holidayAllowance} days</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-green-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((m.holidayUsed ?? 0) / m.holidayAllowance) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-green-600 font-medium">{m.holidayUsed ?? 0} taken</span>
                <span className={`font-medium ${(m.holidayBalance ?? 0) <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                  {m.holidayBalance ?? 0} remaining
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
                    }
