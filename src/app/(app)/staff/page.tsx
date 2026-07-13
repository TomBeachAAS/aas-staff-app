import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, ROLE_LABELS } from '@/lib/utils';
import { startImpersonation } from '@/app/actions/impersonation';

export const dynamic = 'force-dynamic';

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['administrator', 'manager'].includes(profile?.role ?? '')) redirect('/dashboard');

  const sp = await searchParams;
  const statusFilter = sp.status ?? 'active';

  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .eq('status', statusFilter)
    .order('full_name');

  let pendingStaff = null;
  if (profile?.role === 'administrator') {
    const { data } = await supabase.from('profiles').select('*').eq('status', 'pending').order('created_at');
    pendingStaff = data;
  }

  const roleBadge: Record<string, 'blue' | 'green' | 'amber' | 'default' | 'red' | 'purple'> = {
    administrator: 'red',
    manager: 'blue',
    employee: 'green',
    contractor: 'amber',
  };

  const isAdmin = profile?.role === 'administrator';

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Staff</h2>
        {isAdmin && (
          <Link href="/staff/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark">
            <Plus size={16} />
            Add staff
          </Link>
        )}
      </div>

      {pendingStaff && pendingStaff.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3">
            {pendingStaff.length} account{pendingStaff.length > 1 ? 's' : ''} awaiting approval
          </p>
          <div className="space-y-2">
            {pendingStaff.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                  <p className="text-xs text-gray-400">{s.email}</p>
                </div>
                <Link href={`/staff/${s.id}`} className="text-xs bg-green-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-green-700">
                  Approve
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: 'active', label: 'Active' },
          { key: 'pending', label: 'Pending' },
          { key: 'disabled', label: 'Disabled' },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/staff?status=${key}`}
            className={cn(
              'flex-1 text-center py-1.5 rounded-md text-xs font-medium transition-colors',
              statusFilter === key ? 'bg-white text-aas-blue shadow-sm' : 'text-gray-500'
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(staff ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No staff members found</div>
          ) : (
            (staff ?? []).map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-aas-blue flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">
                    {s.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <Link href={`/staff/${s.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{s.job_title ?? s.email}</p>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={roleBadge[s.role] ?? 'default'}>{ROLE_LABELS[s.role]}</Badge>
                  {isAdmin && s.id !== user.id && (
                    <form action={startImpersonation.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors whitespace-nowrap"
                      >
                        Log in as
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
