import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { format } from 'date-fns';

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

export default async function JobsPage({
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
  const filter = sp.filter ?? 'active';

  let query = supabase
    .from('job_board')
    .select('id, title, description, priority, status, created_by, claimed_by, completed_by, completed_at, created_at, customer:customers(company_name), location:locations(name)')
    .order('created_at', { ascending: false });

  if (filter === 'active') {
    query = query.in('status', ['open', 'in_progress']);
  } else if (filter === 'completed') {
    query = query.eq('status', 'completed');
  } else if (filter === 'pending') {
    // Managers see all pending; employees see only their own submissions
    if (isManagerOrAdmin) {
      query = query.eq('status', 'pending_approval');
    } else {
      query = query.eq('status', 'pending_approval').eq('created_by', user.id);
    }
  }

  const { data: jobs } = await query.limit(50);

  const allUserIds = [...new Set([
    ...(jobs ?? []).map((j: any) => j.created_by).filter(Boolean),
    ...(jobs ?? []).map((j: any) => j.claimed_by).filter(Boolean),
    ...(jobs ?? []).map((j: any) => j.completed_by).filter(Boolean),
  ])];
  const { data: profileRows } = allUserIds.length > 0
    ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
    : { data: [] };
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p.full_name]));

  let pendingCount = 0;
  let mySubmissionsCount = 0;
  if (isManagerOrAdmin) {
    const { count } = await supabase
      .from('job_board')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval');
    pendingCount = count ?? 0;
  } else {
    const { count } = await supabase
      .from('job_board')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval')
      .eq('created_by', user.id);
    mySubmissionsCount = count ?? 0;
  }

  const tabs = [
    { key: 'active', label: 'Open / In progress' },
    { key: 'completed', label: 'Completed' },
    ...(isManagerOrAdmin
      ? [{ key: 'pending', label: `Pending approval${pendingCount > 0 ? ` (${pendingCount})` : ''}` }]
      : mySubmissionsCount > 0 || filter === 'pending'
        ? [{ key: 'pending', label: `My submissions${mySubmissionsCount > 0 ? ` (${mySubmissionsCount})` : ''}` }]
        : [{ key: 'pending', label: 'My submissions' }]
    ),
  ];

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Job Board</h2>
        <Link
          href="/jobs/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors"
        >
          <Plus size={16} />
          Add job
        </Link>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/jobs?filter=${t.key}`}
            className={`flex-1 text-center py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(jobs ?? []).length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
              {filter === 'pending' ? 'No pending submissions' : 'No jobs here'}
            </div>
          ) : (
            (jobs ?? []).map((job: any) => {
              const customer = job.customer as { company_name: string } | undefined;
              const location = job.location as { name: string } | undefined;
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-800">{job.title}</p>
                    <div className="flex gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOURS[job.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {job.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </div>
                  </div>
                  {job.description && (
                    <p className="text-xs text-gray-500 mb-1 line-clamp-2">{job.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    {customer && <span>{customer.company_name}</span>}
                    {location && <span>{location.name}</span>}
                    {job.claimed_by && job.status === 'in_progress' && (
                      <span>Claimed by {profileMap[job.claimed_by] ?? 'someone'}</span>
                    )}
                    {job.completed_by && job.status === 'completed' && (
                      <span>
                        Completed by {profileMap[job.completed_by] ?? 'someone'}
                        {job.completed_at ? ` · ${format(new Date(job.completed_at), 'd MMM')}` : ''}
                      </span>
                    )}
                    {!job.claimed_by && job.status === 'open' && (
                      <span className="text-aas-blue font-medium">Available to claim</span>
                    )}
                    {job.status === 'pending_approval' && (
                      <span className="text-amber-600 font-medium">Awaiting approval</span>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
