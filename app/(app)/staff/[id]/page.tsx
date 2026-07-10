import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ROLE_LABELS } from '@/lib/utils';
import { StaffActionButtons } from '@/components/staff/StaffActionButtons';

export const dynamic = 'force-dynamic';

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = viewer?.role === 'administrator';
  const isManager = ['administrator', 'manager'].includes(viewer?.role ?? '');
  if (!isManager) redirect('/dashboard');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (!profile) notFound();

  const { data: pattern } = await supabase.from('working_patterns').select('*').eq('user_id', id).eq('is_current', true).single();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayKeys: (keyof typeof pattern)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const workingDays = pattern ? dayNames.filter((_, i) => pattern[dayKeys[i]]) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-aas-blue flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">
            {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{profile.full_name}</h2>
          <p className="text-sm text-gray-500">{profile.job_title ?? profile.email}</p>
          <Badge variant={profile.status === 'active' ? 'green' : profile.status === 'pending' ? 'amber' : 'red'} className="mt-1">
            {profile.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Row label="Email" value={profile.email} />
          <Row label="Phone" value={profile.phone} />
          <Row label="Role" value={ROLE_LABELS[profile.role]} />
          <Row label="Department" value={profile.department} />
          {profile.start_date && <Row label="Start date" value={format(new Date(profile.start_date), 'd MMM yyyy')} />}
          {profile.end_date && <Row label="End date" value={format(new Date(profile.end_date), 'd MMM yyyy')} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Working pattern</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1.5 flex-wrap">
            {dayNames.map(d => (
              <span
                key={d}
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  workingDays.includes(d) ? 'bg-aas-blue text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{pattern?.weekly_hours ?? 45}h per week</p>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Holiday allowance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-800">{profile.holiday_allowance} <span className="text-sm text-gray-400 font-normal">days per leave year</span></p>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <StaffActionButtons
          staffId={id}
          currentStatus={profile.status}
          currentRole={profile.role}
        />
      )}

      <Link href="/staff" className="text-sm text-aas-blue hover:underline">← Back to staff</Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  );
}
