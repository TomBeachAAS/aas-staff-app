import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format, isToday, isPast } from 'date-fns';
import { Umbrella, CheckSquare, Clock, AlertCircle, Users, CalendarX, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { HolidayStatusBadge, TaskStatusBadge } from '@/components/ui/Badge';
import { getLeaveYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const today = format(new Date(), 'yyyy-MM-dd');
  const leaveYear = getLeaveYear();

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
    .select('*, assignees:task_assignees(user_id)')
    .or(`created_by.eq.${user.id}`)
    .not('status', 'in', '("completed","cancelled")')
    .lte('task_date', today)
    .order('task_date')
    .limit(10);

  // My pending holiday requests
  const { data: pendingHolidays } = await supabase
    .from('holidays')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('start_date')
    .limit(5);

  // Upcoming approved holidays
  const { data: upcomingHolidays } = await supabase
    .from('holidays')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .gte('start_date', today)
    .order('start_date')
    .limit(3);

  // Recent timesheet entries
  const { data: recentTimesheets } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('work_date', { ascending: false })
    .limit(5);

  // Manager data
  let pendingApprovals: number | null = null;
  let staffOffToday: number | null = null;
  let staffWorkingToday: number | null = null;
  let overdueTaskCount: number | null = null;
  let pendingExpenses: number | null = null;

  if (isManagerOrAdmin) {
    const { count: approvalCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingApprovals = approvalCount;

    const { count: offCount } = await supabase
      .from('holidays')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today);
    staffOffToday = offCount;

    const { count: overdueCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("completed","cancelled")')
      .lt('task_date', today);
    overdueTaskCount = overdueCount;

    const { count: expCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted');
    pendingExpenses = expCount;
  }

  const overdueTasks = (myTasks ?? []).filter(t => t.task_date && t.task_date < today);
  const todayTasks = (myTasks ?? []).filter(t => t.task_date === today);

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Good {getGreeting()}, {profile.full_name.split(' ')[0]}</h2>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Manager stats */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Pending Approvals" value={pendingApprovals ?? 0} icon={Umbrella} iconColor="text-amber-600" iconBg="bg-amber-50" />
          <StatCard label="Staff Off Today" value={staffOffToday ?? 0} icon={CalendarX} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <StatCard label="Overdue Tasks" value={overdueTaskCount ?? 0} icon={AlertCircle} iconColor="text-red-600" iconBg="bg-red-50" />
          <StatCard label="Expenses to Review" value={pendingExpenses ?? 0} icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-50" />
        </div>
      )}

      {/* Holiday balance */}
      {profile.holiday_access && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Days Remaining" value={balance?.remaining ?? '—'} icon={Umbrella} />
          <StatCard label="Days Used" value={balance?.used ?? 0} icon={CheckSquare} iconColor="text-green-600" iconBg="bg-green-50" />
          <StatCard label="Days Pending" value={balance?.pending ?? 0} icon={Clock} iconColor="text-amber-600" iconBg="bg-amber-50" />
        </div>
      )}

      {/* Today's work */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s schedule</CardTitle>
        </CardHeader>
        {(todayEvents ?? []).length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">Nothing planned for today</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-50">
            {(todayEvents ?? []).map(ev => (
              <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-aas-blue mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{ev.title ?? ev.event_type.replace('_', ' ')}</p>
                  {ev.customer && <p className="text-xs text-gray-500">{(ev.customer as {company_name: string}).company_name}</p>}
                  {ev.location && <p className="text-xs text-gray-400">{(ev.location as {name: string}).name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <Link href="/tasks" className="text-xs text-aas-blue hover:underline">View all</Link>
        </CardHeader>
        {overdueTasks.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Overdue</p>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map(task => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 rounded border-2 border-red-300 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-aas-blue truncate">{task.title}</span>
                  <span className="text-xs text-red-400 shrink-0">{task.task_date}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {todayTasks.length === 0 && overdueTasks.length === 0 ? (
          <CardContent><p className="text-sm text-gray-400 text-center py-4">No tasks due</p></CardContent>
        ) : (
          <div className="px-4 pb-3 mt-3">
            {todayTasks.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Due today</p>}
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map(task => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-aas-blue truncate">{task.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Upcoming holidays */}
      {profile.holiday_access && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Upcoming holiday</CardTitle>
            <Link href="/holidays" className="text-xs text-aas-blue hover:underline">View all</Link>
          </CardHeader>
          {(pendingHolidays ?? []).length === 0 && (upcomingHolidays ?? []).length === 0 ? (
            <CardContent><p className="text-sm text-gray-400 text-center py-4">No upcoming holiday</p></CardContent>
          ) : (
            <div className="divide-y divide-gray-50">
              {[...(pendingHolidays ?? []), ...(upcomingHolidays ?? [])].slice(0, 5).map(h => (
                <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {format(new Date(h.start_date), 'd MMM')} – {format(new Date(h.end_date), 'd MMM yyyy')}
                    </p>
                    <p className="text-xs text-gray-400">{h.working_days} {h.working_days === 1 ? 'day' : 'days'}</p>
                  </div>
                  <HolidayStatusBadge status={h.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Manager: quick links */}
      {isManagerOrAdmin && pendingApprovals! > 0 && (
        <Card>
          <CardContent className="py-3">
            <Link
              href="/holidays?filter=pending"
              className="flex items-center justify-between text-sm text-aas-blue font-medium hover:underline"
            >
              <span>Review {pendingApprovals} pending holiday {pendingApprovals === 1 ? 'request' : 'requests'}</span>
              <span>→</span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
