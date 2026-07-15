import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Pencil, Wrench, Truck } from 'lucide-react';
import { TaskStatusBadge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { TaskCompleteForm } from '@/components/tasks/TaskCompleteForm';
import { TaskDeleteButton } from '@/components/tasks/TaskDeleteButton';

export const dynamic = 'force-dynamic';

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: task } = await supabase
    .from('tasks')
    .select('*, customer:customers(company_name), location:locations(name, address_line1, postcode, latitude, longitude), created_by_profile:profiles!tasks_created_by_fkey(full_name), equipment:equipment(id, name, type, make, model, registration)')
    .eq('id', id)
    .single();

  if (!task) notFound();

  const { data: assigneeRows } = await supabase
    .from('task_assignees')
    .select('user_id')
    .eq('task_id', id);

  const assigneeIds = (assigneeRows ?? []).map(r => r.user_id);
  const { data: assigneeProfiles } = assigneeIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', assigneeIds)
    : { data: [] };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');
  const isAssigned = assigneeIds.includes(user.id);
  const canComplete = isAssigned || task.created_by === user.id || isManagerOrAdmin;
  const canEdit = task.created_by === user.id || isManagerOrAdmin;

  const customer = task.customer as { company_name: string } | null;
  const location = task.location as { name: string; address_line1?: string; postcode?: string; latitude?: number; longitude?: number } | null;
  const creator = task.created_by_profile as { full_name: string } | null;
  const eq = task.equipment as { id: string; name: string; type: string; make?: string; model?: string; registration?: string } | null;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">{task.title}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <TaskStatusBadge status={task.status} />
          {canEdit && (
            <Link
              href={'/tasks/' + id + '/edit'}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Pencil size={14} />
              Edit
            </Link>
          )}
        </div>
      </div>

      {task.task_date && (
        <p className="text-sm text-gray-500">
          {format(new Date(task.task_date), 'EEEE, d MMMM yyyy')}
          {task.start_time ? ' — ' + task.start_time.slice(0, 5) + (task.end_time ? ' to ' + task.end_time.slice(0, 5) : '') : ''}
        </p>
      )}

      {task.description && (
        <Card>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {customer && (
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Customer</p>
            <p className="text-sm font-medium text-gray-800">{customer.company_name}</p>
          </div>
        )}
        {location && (
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Location</p>
            <p className="text-sm font-medium text-gray-800">{location.name}</p>
            {location.postcode && <p className="text-xs text-gray-400">{location.postcode}</p>}
            {location.latitude && location.longitude && (
              <a
                href={'https://maps.google.com/?q=' + location.latitude + ',' + location.longitude}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-aas-blue hover:underline"
              >
                Open in Maps
              </a>
            )}
          </div>
        )}
        {eq && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 col-span-2">
            <p className="text-xs text-gray-400 mb-1">Vehicle / Equipment</p>
            <Link href={'/equipment/' + eq.id} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className={'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ' + (eq.type === 'vehicle' ? 'bg-green-50' : 'bg-blue-50')}>
                {eq.type === 'vehicle'
                  ? <Truck size={13} className="text-green-600" />
                  : <Wrench size={13} className="text-aas-blue" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{eq.name}</p>
                {(eq.make || eq.model || eq.registration) && (
                  <p className="text-xs text-gray-400">
                    {[eq.make, eq.model, eq.registration ? '(' + eq.registration + ')' : ''].filter(Boolean).join(' ')}
                  </p>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>

      {assigneeProfiles && assigneeProfiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-1">Assigned to</p>
          <div className="flex flex-wrap gap-1.5">
            {assigneeProfiles.map(p => (
              <span key={p.id} className="text-xs bg-aas-blue-pale text-aas-blue px-2 py-0.5 rounded-full font-medium">
                {p.full_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {creator && (
        <p className="text-xs text-gray-400">Created by {creator.full_name}</p>
      )}

      {task.notes && (
        <Card>
          <CardContent>
            <p className="text-xs text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.notes}</p>
          </CardContent>
        </Card>
      )}

      {task.status === 'completed' && task.completed_at && (
        <div className="bg-green-50 rounded-xl border border-green-100 p-3">
          <p className="text-xs text-green-600 font-medium">
            Completed {format(new Date(task.completed_at), 'd MMM yyyy HH:mm')}
          </p>
          {task.completion_notes && <p className="text-sm text-green-700 mt-1">{task.completion_notes}</p>}
        </div>
      )}

      {canComplete && !['completed', 'cancelled'].includes(task.status) && (
        <TaskCompleteForm taskId={task.id} userId={user.id} />
      )}

      {canEdit && (
        <TaskDeleteButton taskId={task.id} />
      )}

      <div className="flex gap-2">
        <Link href="/tasks" className="text-sm text-aas-blue hover:underline">← Back to tasks</Link>
      </div>
    </div>
  );
}
