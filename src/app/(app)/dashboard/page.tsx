import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format, isToday } from 'date-fns';
import {
  Umbrella, CheckSquare, Clock, AlertCircle,
  CalendarX, ClipboardList, Plus, TrendingUp,
  ChevronRight, Calendar
} from 'lucide-react';
import { getLeaveYear, CALENDAR_EVENT_COLOURS, CALENDAR_EVENT_LABELS, cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const today = format(new Date(), 'yyyy-MM-dd');
  const leaveYear = getLeaveYear();

  // ── Data fetching ────────────────────────────────────────────

  // Holiday balance
  const { data: balanceRows } = await supabase.rpc('get_holiday_balance', {
    p_user_id: user.id,
    p_leave_year: leaveYear,
  });
  const balance = balanceRows?.[0];

  // Today's calendar events for this user
  const { data: todayEvents } = await supabase
    .from('calendar_events')
    .select('*, customer:customers(company_name), location:locations(name)')
    .eq('user_id', user.id)
    .lte('start_datetime', `${today}T23:59:59`)
    .gte('end_datetime', `${today}T00:00:00`)
    .order('start_datetime');

  // My tasks due today or overdue
  const { data: myTasks } = await supabase
    .from('tasks')
    .select('id, title, task_date, status, priority')
    .eq('created_by', user.id)
    .not('status', 'in', '("completed","cancelled")')
    .lte('task_date', today)
    .order('task_date')
    .limit(8);

  // My next upcoming approved holiday
  const { data: upcomingHolidays } = await supabase
    .from('holidays')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['approved', 'pending'])
    .gte('start_date', today)
    .order('start_date')
    .limit(2);

  // My currently claimed job
  const { data: myActiveJob } = await supabase
    .from('job_board')
    .select('id, title, priority')
    .eq('claimed_by', user.id)
    .eq('status', 'in_progress')
    .limit(1)
    .maybeSingle();

  // Open jobs available to claim
  const { count: openJobsCount } = await supabase
    .from('job_board')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  // ── Manager data ─────────────────────────────────────────────

  let pendingHolidayCount = 0;
  let pendingJobCount = 0;
  let overdueTaskCount = 0;
  let pendingExpenseCount = 0;
  let staffOffToday: { id: string; full_name: string }[] = [];
  let staffOnLeaveIds: string[] = [];

  if (isManagerOrAdmin) {
    // Who's off today
    const { data: offHolidays } = await supabase
      .from('holidays')
      .select('user_id')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today);

    staffOnLeaveIds = (offHolidays ?? []).map(h => h.user_id);

    if (staffOnLeaveIds.length > 0) {
      const { data: offProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffOnLeaveIds)
        .eq('status', 'active');
      staffOffToday = offProfiles ?? [];
    }

    const [
      { count: hCount },
      { count: jCount },
      { count: tCount },
      { count: eCount },
    ] = await Promise.all([
      supabase.from('holidays').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('job_board').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled")').lt('task_date', today),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    ]);

    pendingHolidayCount = hCount ?? 0;
    pendingJobCount = jCount ?? 0;
    overdueTaskCount = tCount ?? 0;
    pendingExpenseCount = eCount ?? 0;
  }

  const overdueTasks = (myTasks ?? []).filter(t => t.task_date < today);
  const todayTasks = (myTasks ?? []).filter(t => t.task_date === today);
  const totalAttention = pendingHolidayCount + pendingJobCount;

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {getGreeting()}, {profile.full_name.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* ── Manager attention banner ── */}
      {isManagerOrAdmin && totalAttention > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Needs your attention</p>
          <div className="space-y-1.5">
            {pendingHolidayCount > 0 && (
              <Link href="/holidays?filter=pending" className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <Umbrella size={14} className="text-amber-600" />
                  <span className="text-sm text-amber-900 font-medium">
                    {pendingHolidayCount} holiday {pendingHolidayCount === 1 ? 'request' : 'requests'}
                  </span>
                </div>
                <ChevronRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            {pendingJobCount > 0 && (
              <Link href="/jobs?filter=pending" className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <ClipboardList size={14} className="text-amber-600" />
                  <span className="text-sm text-amber-900 font-medium">
                    {pendingJobCount} job {pendingJobCount === 1 ? 'submission' : 'submissions'}
                  </span>
                </div>
                <ChevronRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            {overdueTaskCount > 0 && (
              <Link href="/tasks" className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="text-sm text-red-700 font-medium">
                    {overdueTaskCount} overdue {overdueTaskCount === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <ChevronRight size={14} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Who's off today (manager) ── */}
      {isManagerOrAdmin && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Team today</p>
          {staffOffToday.length === 0 ? (
            <p className="text-sm text-gray-500">Everyone is in today 🙌</p>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold text-gray-800">{staffOffToday.length}</span> {staffOffToday.length === 1 ? 'person' : 'people'} on leave:
              </p>
              <div className="flex flex-wrap gap-2">
                {staffOffToday.map(s => (
                  <span key={s.id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {s.full_name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {pendingExpenseCount > 0 && (
            <Link href="/expenses" className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 group">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-purple-500" />
                <span className="text-sm text-gray-700">{pendingExpenseCount} expense{pendingExpenseCount !== 1 ? 's' : ''} to review</span>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      {/* ── Today's schedule ── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's schedule</p>
          <Link href="/calendar" className="text-xs text-aas-blue hover:underline">Calendar</Link>
        </div>
        {(todayEvents ?? []).length === 0 && todayTasks.length === 0 && overdueTasks.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Nothing on your schedule today</p>
        ) : (
          <div className="space-y-2">
            {overdueTasks.slice(0, 2).map(task => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle size={14} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-aas-blue">{task.title}</p>
                  <p className="text-xs text-red-400">Overdue · {format(new Date(task.task_date), 'd MMM')}</p>
                </div>
              </Link>
            ))}
            {todayTasks.map(task => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-aas-blue-pale flex items-center justify-center shrink-0">
                  <CheckSquare size={14} className="text-aas-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate group-hover:text-aas-blue">{task.title}</p>
                  <p className="text-xs text-gray-400">Task · due today</p>
                </div>
              </Link>
            ))}
            {(todayEvents ?? []).map(ev => {
              const colour = CALENDAR_EVENT_COLOURS[ev.event_type] ?? 'bg-gray-100';
              const customer = ev.customer as { company_name: string } | undefined;
              const location = ev.location as { name: string } | undefined;
              return (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colour)}>
                    <Calendar size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {ev.title ?? CALENDAR_EVENT_LABELS[ev.event_type] ?? ev.event_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ev.all_day ? 'All day' : format(new Date(ev.start_datetime), 'HH:mm')}
                      {customer ? ` · ${customer.company_name}` : ''}
                      {location ? ` · ${location.name}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick actions</p>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/calendar"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-aas-blue text-white hover:bg-aas-blue-dark transition-colors"
          >
            <Plus size={20} />
            <span className="text-xs font-medium text-center">Add event</span>
          </Link>
          <Link
            href="/jobs"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 hover:border-aas-blue hover:text-aas-blue transition-colors"
          >
            <ClipboardList size={20} />
            <span className="text-xs font-medium text-center">
              Job board{(openJobsCount ?? 0) > 0 ? ` (${openJobsCount})` : ''}
            </span>
          </Link>
          {profile.timesheet_access ? (
            <Link
              href="/timesheets"
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 hover:border-aas-blue hover:text-aas-blue transition-colors"
            >
              <Clock size={20} />
              <span className="text-xs font-medium text-center">Log time</span>
            </Link>
          ) : (
            <Link
              href="/tasks"
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 text-gray-700 hover:border-aas-blue hover:text-aas-blue transition-colors"
            >
              <CheckSquare size={20} />
              <span className="text-xs font-medium text-center">Tasks</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── My active job ── */}
      {myActiveJob && (
        <Link href={`/jobs/${myActiveJob.id}`} className="block rounded-2xl bg-violet-50 border border-violet-100 p-4 hover:border-violet-300 transition-colors">
          <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-1">Your current job</p>
          <p className="text-sm font-semibold text-violet-900">{myActiveJob.title}</p>
          <p className="text-xs text-violet-500 mt-0.5">Tap to mark complete →</p>
        </Link>
      )}

      {/* ── Holiday balance ── */}
      {profile.holiday_access && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Holiday balance</p>
            <Link href="/holidays" className="text-xs text-aas-blue hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-aas-blue">{balance?.remaining ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">Remaining</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold text-green-600">{balance?.used ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Used</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{balance?.pending ?? 0}</p>
              <p className="text-xs text-gray-400 mt-0.5">Pending</p>
            </div>
          </div>
          {(upcomingHolidays ?? []).length > 0 && (
            <div className="pt-3 border-t border-gray-50 space-y-1.5">
              {(upcomingHolidays ?? []).map(h => (
                <div key={h.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Umbrella size={13} className={h.status === 'approved' ? 'text-green-500' : 'text-amber-400'} />
                    <span className="text-xs text-gray-600">
                      {format(new Date(h.start_date), 'd MMM')} – {format(new Date(h.end_date), 'd MMM')}
                    </span>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    h.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  )}>
                    {h.status === 'approved' ? 'Approved' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
