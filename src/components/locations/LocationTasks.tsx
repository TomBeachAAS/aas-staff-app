'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  task_date: string | null;
};

const PRIORITY_COLOURS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-aas-blue',
  low: 'bg-gray-300',
};

const STATUS_COLOURS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-violet-100 text-violet-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

export function LocationTasks() {
  const pathname = usePathname();
  // pathname = /locations/[id] or /locations/[id]/edit
  const segments = pathname.split('/');
  const locationId = segments[2];

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId || segments[3]) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from('tasks')
      .select('id, title, status, priority, task_date')
      .eq('location_id', locationId)
      .not('status', 'eq', 'cancelled')
      .order('task_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTasks(data ?? []);
        setLoading(false);
      });
  }, [locationId, segments]);

  // Only show on the detail page (no extra segment)
  if (segments[3]) return null;
  if (loading || tasks.length === 0) return null;

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="px-4 pb-6 max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
          <ClipboardList size={15} className="text-gray-400" />
          <p className="text-sm font-semibold text-gray-700">Linked tasks</p>
          <span className="ml-auto text-xs text-gray-400">{tasks.length}</span>
        </div>
        <div className="divide-y divide-gray-50">
          {tasks.map(task => {
            const isOverdue =
              task.task_date &&
              task.task_date < today &&
              !['completed', 'cancelled'].includes(task.status);
            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    PRIORITY_COLOURS[task.priority] ?? 'bg-gray-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      task.status === 'completed'
                        ? 'line-through text-gray-400'
                        : 'text-gray-800'
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.task_date && (
                    <p
                      className={`text-xs mt-0.5 ${
                        isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {isOverdue ? 'Overdue — ' : ''}
                      {format(new Date(task.task_date + 'T12:00:00'), 'd MMM yyyy')}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    STATUS_COLOURS[task.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {task.status.replace('_', ' ')}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
