import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const PRIORITY_COLOURS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-aas-blue',
  low: 'bg-gray-300',
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const sp = await searchParams;
  const statusFilter = sp.status ?? 'active';
  const today = format(new Date(), 'yyyy-MM-dd');

  // Tasks I'm assigned to (used to filter for non-managers)
  const { data: assignedTaskIds } = await supabase
    .from('task_assignees')
    .select('task_id')
    .eq('user_id', user.id);
  const myTaskIds = new Set((assignedTaskIds ?? []).map(r => r.task_id));

  let query = supabase
    .from('tasks')
    .select('*, assignees:task_assignees(user_id, user:profiles!task_assignees_user_id_fkey(full_name)), customer:customers(company_name), location:locations(name), created_by_profile:profiles!tasks_created_by_fkey(full_name)')
    .order('task_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (statusFilter === 'active') {
    query = query.not('status', 'in', '("completed","cancelled")');
  } else if (statusFilter === 'completed') {
    query = query.eq('status', 'completed');
  } else if (statusFilter === 'overdue') {
    query = query.not('status', 'in', '("completed","cancelled")').lt('task_date', today);
  }

  const { data: tasks, error: tasksError } = await query.limit(100);

  // For non-managers: filter to tasks the user created or is assigned to
  const visibleTasks = isManagerOrAdmin
    ? (tasks ?? [])
    : (tasks ?? []).filter((t: any) => t.created_by === user.id || myTaskIds.has(t.id));

  const overdueTasks = visibleTasks.filter((t: any) => t.task_date && t.task_date < today && !['completed', 'cancelled'].includes(t.status));
  const todayTasks = visibleTasks.filter((t: any) => t.task_date === today);
  const futureTasks = visibleTasks.filter((t: any) => !t.task_date || t.task_date > today);

  function TaskRow({ task }: { task: (typeof tasks extends (infer T)[] | null ? T : never) }) {
    const assignees = (task.assignees as { user: { full_name: string } }[] | undefined) ?? [];
    const customer = task.customer as { company_name: string } | undefined;
    const isOverdue = task.task_date && task.task_date < today && !['completed', 'cancelled'].includes(task.status);

    return (
      <Link href={`/tasks/${task.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-3">
          <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', PRIORITY_COLOURS[task.priority])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-sm font-medium truncate', task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800')}>
                {task.title}
              </p>
              <TaskStatusBadge status={task.status} />
            </div>
            {task.task_date && (
              <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                {isOverdue ? 'Overdue — ' : ''}{format(new Date(task.task_date), 'd MMM yyyy')}
                {task.start_time ? ` at ${task.start_time.slice(0, 5)}` : ''}
              </p>
            )}
            <div className="flex gap-2 mt-0.5">
              {customer && <p className="text-xs text-gray-400">{customer.company_name}</p>}
              {assignees.length > 0 && (
                <p className="text-xs text-gray-400">
                  {assignees.map((a: any) => a.user?.full_name?.split(' ')[0]).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">
          {isManagerOrAdmin ? 'All tasks' : 'My tasks'}
        </h2>
        <Link
          href="/tasks/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark"
        >
          <Plus size={16} />
          New task
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'completed', label: 'Completed' },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/tasks?status=${key}`}
            className={cn(
              'flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === key ? 'bg-white text-aas-blue shadow-sm' : 'text-gray-500'
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {tasksError && (
        <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700 font-mono break-all">
          {tasksError.message}
        </div>
      )}

      {statusFilter === 'active' && (
        <>
          {overdueTasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-red-600">Overdue ({overdueTasks.length})</CardTitle></CardHeader>
              <div className="divide-y divide-gray-50">
                {overdueTasks.map((t: any) => <TaskRow key={t.id} task={t} />)}
              </div>
            </Card>
          )}
          {todayTasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Due today</CardTitle></CardHeader>
              <div className="divide-y divide-gray-50">
                {todayTasks.map((t: any) => <TaskRow key={t.id} task={t} />)}
              </div>
            </Card>
          )}
          {futureTasks.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
              <div className="divide-y divide-gray-50">
                {futureTasks.map((t: any) => <TaskRow key={t.id} task={t} />)}
              </div>
            </Card>
          )}
          {visibleTasks.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">No active tasks</div>
          )}
        </>
      )}

      {statusFilter !== 'active' && (
        <Card>
          <div className="divide-y divide-gray-50">
            {visibleTasks.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">No tasks</div>
            ) : (
              visibleTasks.map((t: any) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
