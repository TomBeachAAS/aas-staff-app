import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { BreakdownActions } from '@/components/breakdowns/BreakdownActions';

export const dynamic = 'force-dynamic';

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  low:      { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
};

const CAN_CONTINUE_LABELS: Record<string, string> = {
  yes:     '✅ Yes, can keep working',
  caution: '⚠️ Use with caution',
  no:      '🚫 Grounded — do not use',
};

export default async function BreakdownDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: b } = await supabase
    .from('breakdowns')
    .select(`
      *,
      reporter:profiles!reported_by(full_name),
      equipment:equipment(id, name),
      converter:profiles!converted_by(full_name),
      resolver:profiles!resolved_by(full_name)
    `)
    .eq('id', params.id)
    .single();

  if (!b) notFound();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const urgency = URGENCY_STYLES[b.urgency] ?? URGENCY_STYLES.medium;
  const machineName = (b.equipment as any)?.name ?? b.machine_name ?? 'Unknown machine';

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <Link href="/breakdowns" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-aas-blue">
        <ArrowLeft size={16} /> Breakdowns
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-gray-800 flex-1">{b.title}</h2>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${urgency.bg} ${urgency.text}`}>
            {urgency.label}
          </span>
        </div>

        <p className="text-sm font-medium text-gray-600">{machineName}</p>

        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{b.description}</div>

        {b.cause && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Cause</p>
            <p className="text-sm text-gray-700">{b.cause}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Can it work?</p>
            <p className="text-sm">{CAN_CONTINUE_LABELS[b.can_continue] ?? b.can_continue}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Found</p>
            <p className="text-sm text-gray-700">{format(new Date(b.reported_at), 'd MMM yyyy HH:mm')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reported by</p>
            <p className="text-sm text-gray-700">{(b.reporter as any)?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm capitalize text-gray-700">{b.status}</p>
          </div>
        </div>

        {/* Converted info */}
        {b.status === 'converted' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50">
            <ArrowRightLeft size={16} className="text-aas-blue shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-aas-blue">Converted</span>
              <span className="text-gray-600"> by {(b.converter as any)?.full_name ?? '—'} on {b.converted_at ? format(new Date(b.converted_at), 'd MMM yyyy') : '—'}</span>
              {b.converted_to_task_id && (
                <Link href={`/tasks/${b.converted_to_task_id}`} className="block text-aas-blue hover:underline mt-0.5">View task →</Link>
              )}
              {b.converted_to_job_id && (
                <Link href={`/jobs/${b.converted_to_job_id}`} className="block text-aas-blue hover:underline mt-0.5">View job →</Link>
              )}
            </div>
          </div>
        )}

        {/* Resolved info */}
        {b.status === 'resolved' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-green-700">Resolved</span>
              {b.resolved_at && <span className="text-gray-600"> on {format(new Date(b.resolved_at), 'd MMM yyyy')}</span>}
              {b.resolution_notes && <p className="text-gray-600 mt-0.5">{b.resolution_notes}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Photos */}
      {Array.isArray(b.photos) && b.photos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos</p>
          <div className="grid grid-cols-2 gap-2">
            {b.photos.map((url: string, i: number) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt={`Breakdown photo ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {b.status === 'open' && (
        <BreakdownActions
          breakdownId={b.id}
          isManagerOrAdmin={isManagerOrAdmin}
          reportedBy={(b as any).reported_by}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}
