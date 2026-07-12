import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { JobActionButtons } from '@/components/jobs/JobActionButtons';

export const dynamic = 'force-dynamic';

const PRIORITY_COLOURS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const STATUS_COLOURS: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  open: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Pending Approval',
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
};

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: job } = await supabase.from('job_board').select('*').eq('id', id).single();
  if (!job) notFound();

  const userIds = [...new Set([job.created_by, job.claimed_by, job.completed_by, job.approved_by].filter(Boolean))];
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map(p => [p.id, p.full_name]));

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">{job.title}</h2>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLOURS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLOURS[job.priority]}`}>
        {job.priority} priority
      </span>

      {job.description && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <p className="text-xs text-gray-400 mb-0.5">Added by</p>
          <p className="text-sm font-medium text-gray-700">{profileMap[job.created_by] ?? 'Unknown'}</p>
          <p className="text-xs text-gray-400">{format(new Date(job.created_at), 'd MMM yyyy')}</p>
        </div>

        {job.claimed_by && (
          <div className="bg-white rounded-xl border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-0.5">Claimed by</p>
            <p className="text-sm font-medium text-gray-700">{profileMap[job.claimed_by] ?? 'Unknown'}</p>
            {job.claimed_at && <p className="text-xs text-gray-400">{format(new Date(job.claimed_at), 'd MMM yyyy')}</p>}
          </div>
        )}

        {job.completed_by && (
          <div className="bg-green-50 rounded-xl border border-green-100 p-3 col-span-2">
            <p className="text-xs text-green-600 font-medium mb-0.5">Completed</p>
            <p className="text-sm font-medium text-green-800">{profileMap[job.completed_by] ?? 'Unknown'}</p>
            {job.completed_at && <p className="text-xs text-green-600">{format(new Date(job.completed_at), 'd MMM yyyy HH:mm')}</p>}
            {job.completion_notes && <p className="text-sm text-green-700 mt-1 italic">"{job.completion_notes}"</p>}
          </div>
        )}
      </div>

      <JobActionButtons
        job={job}
        currentUserId={user.id}
        isManagerOrAdmin={isManagerOrAdmin}
        claimedByName={job.claimed_by ? (profileMap[job.claimed_by] ?? undefined) : undefined}
      />

      <Link href="/jobs" className="block text-sm text-aas-blue hover:underline">← Back to Job Board</Link>
    </div>
  );
}
