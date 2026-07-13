import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format, subDays, startOfWeek } from 'date-fns';
import { Umbrella, CheckSquare, AlertCircle, CalendarX, TrendingUp, Briefcase, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { MotivationalBanner } from '@/components/dashboard/MotivationalBanner';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const todayStart = today + 'T00:00:00';
  const todayEnd = today + 'T23:59:59';
  const sevenDaysAgoStart = sevenDaysAgo + 'T00:00:00';
  const weekStartDt = weekStart + 'T00:00:00';

  const { data: todayEvents } = await supabase
    .from('calendar_events')
    .select('*, customer:customers(company_name), location:locations(name)')
    .eq('user_id', user.id)
    .lte('start_datetime', todayEnd)
    .gte('end_datetime', todayStart)
    .order('start_datetime');

  const { data: myTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('created_by', user.id)
    .not('status', 'in', '("completed","cancelled")')
    .lte('task_date', today)
    .order('task_date')
    .limit(10);

  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('id, title, updated_at')
    .eq('created_by', user.id)
    .eq('status', 'completed')
    .gte('updated_at', sevenDaysAgoStart)
    .order('updated_at', { ascending: false })
    .limit(5);

  const [
    { count: openJobsCount },
    { count: completedJobsThisWeek },
  ] = await Promise.all([
    supabase.from('job_board').select('*', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
    supabase.from('job_board').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', weekStartDt),
  ]);

  let pendingApprovals: number | null = null;
  let staffOffToday: number | null = null;
  let overdueTaskCount: number | null = null;
  let pendingExpenses: number | null = null;

  if (isManagerOrAdmin) {
    const [
      { count: approvalCount },
      { count: offCount },
      { count: overdueCount },
      { count: expCount },
    ] = await Promise.all([
      supabase.from('holidays').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('holidays').select('*', { count: 'exact', head: true }).eq('status', 'approved').lte('start_date', today).gte('end_date', today),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed","cancelled")').lt('task_date', today),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    ]);
    pendingApprovals = approvalCount;
    staffOffToday = offCount;
    overdueTaskCount = overdueCount;
    pendingExpenses = expCount;
  }

  const overdueTasks = (myTasks ?? []).filter((t: any) => t.task_date && t.task_date < today);
  const todayTasks = (myTasks ?? []).filter((t: any) => t.task_date === today);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-gray-800">
          Good {getGreeting()}, {profile.full_name.split(' ')[0]}
        </h2>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      
    href="https://robotti.agrointelli.com/"
      target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between bg-green-700 hover:bg-green-800 transition-colors rounded-xl px-4 py-3"
      >
        <div>
          <p className="text-white font-semibold text-sm">Robotti Dashboard</p>
          <p className="text-green-200 text-xs">robotti.agrointelli.com</p>
        </div>
        <ExternalLink size={18} className="text-green-300 shrink-0" />
      </a>

      <MotivationalBanner />

      <WeatherWidget />

      {isManagerOrAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Pending Approvals"  value={pendingApprovals ?? 0}  icon={Umbrella}    iconColor="text-amber-600"  iconBg="bg-amber-50"  />
          <StatCard label="Staff Off Today"    value={staffOffToday ?? 0}     icon={CalendarX}   iconColor="text-blue-600"   iconBg="bg-blue-50"   />
          <StatCard label="Overdue Tasks"      value={overdueTaskCount ?? 0}  icon={AlertCircle} iconColor="text-red-600"    iconBg="bg-red-50"    />
          <StatCard label="Expenses to Review" value={pendingExpenses ?? 0}   icon={TrendingUp}  iconColor="text-purple-600" iconBg="bg-purple-50" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Jobs Open"           value={openJobsCount ?? 0}         icon={Briefcase}   iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard label="Completed This Week" value={completedJobsThisWeek ?? 0} icon={CheckSquare} iconColor="text-green-600"  iconBg="bg-green-50"  />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's schedule</CardTitle>
        </CardHeader>
        {(todayEvents ?? []).length === 0 ? (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">Nothing planned for today</p>
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-50">
            {(todayEvents ?? []).map((ev: any) => (
              <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-aas-blue mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    {ev.title ?? ev.event_type?.replace('_', ' ')}
                  </p>
                  {ev.customer && <p className="text-xs text-gray-500">{ev.customer.company_name}</p>}
                  {ev.location && <p className="text-xs text-gray-400">{ev.location.name}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <Link href="/tasks" className="text-xs text-aas-blue hover:underline">View all</Link>
        </CardHeader>

        {overdueTasks.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Overdue</p>
            <div className="space-y-2">
              {overdueTasks.slice(0, 3).map((task: any) => (
                <Link key={task.id} href={'/tasks/' + task.id} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 rounded border-2 border-red-300 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-aas-blue truncate">{task.title}</span>
                  <span className="text-xs text-red-400 shrink-0">{task.task_date}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {todayTasks.length > 0 && (
          <div className="px-4 pb-3 mt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Due today</p>
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task: any) => (
                <Link key={task.id} href={'/tasks/' + task.id} className="flex items-center gap-2 group">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-aas-blue truncate">{task.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {todayTasks.length === 0 && overdueTasks.length === 0 && (completedTasks ?? []).length === 0 && (
          <CardContent>
            <p className="text-sm text-gray-400 text-center py-4">No tasks due — nice work!</p>
          </CardContent>
        )}

        {(completedTasks ?? []).length > 0 && (
          <div className={`px-4 pb-4 pt-3 ${(todayTasks.length > 0 || overdueTasks.length > 0) ? 'border-t border-gray-50 mt-1' : ''}`}>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
              {'Completed last 7 days (' + (completedTasks ?? []).length + ')'}
            </p>
            <div className="space-y-1.5">
              {(completedTasks ?? []).map((task: any) => (
                <div key={task.id} className="flex items-center gap-2">
                  <CheckSquare size={13} className="text-green-500 shrink-0" />
                  <span className="text-sm text-gray-400 line-through truncate">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isManagerOrAdmin && (pendingApprovals ?? 0) > 0 && (
        <Card>
          <CardContent className="py-3">
            <Link
              href="/holidays?filter=pending"
              className="flex items-center justify-between text-sm text-aas-blue font-medium hover:underline"
            >
              <span>
                Review {pendingApprovals} pending holiday {pendingApprovals === 1 ? 'request' : 'requests'}
              </span>
              <span>{'>'}</span>
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
