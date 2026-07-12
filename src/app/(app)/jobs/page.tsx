import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

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

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const sp = await searchParams;
  const filter = sp.filter ?? 'open';

  let query = supabase.from('job_board').select('*').order('created_at', { ascending: false });

  if (filter === 'open') query = query.in('status', ['open', 'in_progress']);
  else if (filter === 'pending') query = query.eq('status', 'pending_approval');
  else if (filter === 'completed') query = query.eq('status', 'completed');

  const { data: jobs } = await query.limit(100);

  const allUserIds = [...new Set([
    ...(jobs ?? []).map((j: any) => j.created_by).filter(Boolean),
    ...(jobs ?? []).map((j: any) => j.claimed_by).filter(Boolean),
    ...(jobs ?? []).map((j: any) => j.completed_by).filter(Boolean),
  ])];
  const { data: profileRows } = allUserIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map(p => [p.id, p.full_name]));

  let pendingCount = 0;
  if (isManagerOrAdmin) {
    const { count } = await supabase
      .from('job_board').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval');
    pendingCount = count ?? 0;
  }

  const filters = [
    { key: 'open', label: 'Open / In Progress' },
    { key: 'completed', label: 'Completed' },
    ...(isManagerOrAdmin ? [{ key: 'pending', label: `Pending Approval${pendingCount > 0 ? ` (${pendingCount})` : ''}` }] : []),
  ];

  return (
    <div className="p-4 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Job Board</h2>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors"
        >
          <Plus size={16} />
          Add Job
        </Link>
      </div>

      {isManagerOrAdmin && pendingCount > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">{pendingCount} job{pendingCount === 1 ? '' : 's'} awaiting approval</p>
          <Link href="/jobs?filter=pending" className="text-xs text-amber-700 underline">Review</Link>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <Link
            key={f.key}
            href={`/jobs?filter=${f.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-aas-blue text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-aas-blue hover:text-aas-blue'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {(jobs ?? []).length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No jobs here</p>
          </div>
        ) : (
          (jobs ?? []).map((job: any) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-aas-blue transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{job.title}</p>
                  {job.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{job.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLOURS[job.priority]}`}>
                      {job.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                    {job.claimed_by && job.status === 'in_progress' && (
                      <span className="text-xs text-gray-400">· {profileMap[job.claimed_by] ?? 'Someone'} is on it</span>
                    )}
                    {job.completed_by && job.status === 'completed' && (
                      <span className="text-xs text-gray-400">
                        · Done by {profileMap[job.completed_by] ?? 'Unknown'} on {format(new Date(job.completed_at), 'd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
