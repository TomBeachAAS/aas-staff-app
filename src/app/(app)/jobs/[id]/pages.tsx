import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { JobActionButtons } from '@/components/jobs/JobActionButtons';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending approval',
  open: 'Open',
  in_progress: 'In progress',
  completed: 'Completed',
};

const STATUS_COLOURS: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-800',
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-green-100 text-green-800',
};

const PRIORITY_COLOURS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: job } = await supabase
    .from('job_board')
    .select('*, customer:customers(company_name), location:locations(name, postcode)')
    .eq('id', id)
    .single();

  if (!job) redirect('/jobs');

  // Two-step profile fetch
  const allUserIds = [...new Set([
    job.created_by,
    job.claimed_by,
    job.completed_by,
    job.approved_by,
  ].filter(Boolean))];

  const { data: profileRows } = allUserIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p.full_name]));

  const customer = job.customer as { company_name: string } | undefined;
  const location = job.location as { name: string; postcode?: string } | undefined;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-lg font-bold text-gray-800">{job.title}</h2>
          <div className="flex gap-1.5 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOURS[job.priority] ?? ''}`}>
              {job.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[job.status] ?? ''}`}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
          </div>
        </div>

        {job.description && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
        )}
      </div>

      {/* Details */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
        {customer && (
          <div className="px-4 py-2.5 flex justify-between text-sm">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-800">{customer.company_name}</span>
          </div>
        )}
        {location && (
          <div className="px-4 py-2.5 flex justify-between text-sm">
            <span className="text-gray-500">Location</span>
            <span className="font-medium text-gray-800">
              {location.name}{location.postcode ? ` · ${location.postcode}` : ''}
            </span>
          </div>
        )}
        <div className="px-4 py-2.5 flex justify-between text-sm">
          <span className="text-gray-500">Added by</span>
          <span className="font-medium text-gray-800">
            {profileMap[job.created_by] ?? 'Unknown'}
            {job.created_at ? ` · ${format(new Date(job.created_at), 'd MMM yyyy')}` : ''}
          </span>
        </div>
        {job.claimed_by && (
          <div className="px-4 py-2.5 flex justify-between text-sm">
            <span className="text-gray-500">Claimed by</span>
            <span className="font-medium text-gray-800">
              {profileMap[job.claimed_by] ?? 'Unknown'}
              {job.claimed_at ? ` · ${format(new Date(job.claimed_at), 'd MMM')}` : ''}
            </span>
          </div>
        )}
        {job.completed_by && (
          <div className="px-4 py-2.5 flex justify-between text-sm">
            <span className="text-gray-500">Completed by</span>
            <span className="font-medium text-gray-800">
              {profileMap[job.completed_by] ?? 'Unknown'}
              {job.completed_at ? ` · ${format(new Date(job.completed_at), 'd MMM yyyy')}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Completion notes */}
      {job.completion_notes && (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
          <p className="text-xs font-semibold text-green-700 mb-1">Completion notes</p>
          <p className="text-sm text-green-800 whitespace-pre-wrap">{job.completion_notes}</p>
        </div>
      )}

      {/* Actions */}
      <JobActionButtons
        job={{
          id: job.id,
          status: job.status,
          claimed_by: job.claimed_by ?? null,
        }}
        currentUserId={user.id}
        isManagerOrAdmin={isManagerOrAdmin}
      />
    </div>
  );
}
