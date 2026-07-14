import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ROLE_LABELS } from '@/lib/utils';
import { StaffActionButtons } from '@/components/staff/StaffActionButtons';
import { WorkingPatternEditor } from '@/components/staff/WorkingPatternEditor';
import { Clock } from 'lucide-react';

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

  const { data: pattern } = await supabase
    .from('working_patterns')
    .select('*')
    .eq('user_id', id)
    .eq('is_current', true)
    .single();

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
          <WorkingPatternEditor
            userId={id}
            pattern={pattern ? {
              id: (pattern as any).id,
              mon: !!pattern.mon,
              tue: !!pattern.tue,
              wed: !!pattern.wed,
              thu: !!pattern.thu,
              fri: !!pattern.fri,
              sat: !!pattern.sat,
              sun: !!pattern.sun,
              weekly_hours: pattern.weekly_hours ?? 40,
            } : null}
          />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader><CardTitle>Holiday allowance</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-800">
              {profile.holiday_allowance}{' '}
              <span className="text-sm text-gray-400 font-normal">days per leave year</span>
            </p>
          </CardContent>
        </Card>
      )}

      {profile.timesheet_access && (
        <Link
          href={`/timesheets?user=${id}`}
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <Clock size={18} className="text-aas-blue shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">View timesheets</p>
            <p className="text-xs text-gray-400">Review and approve {profile.full_name.split(' ')[0]}'s hours</p>
          </div>
        </Link>
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
