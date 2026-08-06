import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, AlertTriangle, CheckCircle2, ArrowRightLeft, Circle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'High' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medium' },
  low:      { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Low' },
};

const CAN_CONTINUE_STYLES: Record<string, { label: string; colour: string }> = {
  yes:     { label: 'Can work', colour: 'text-green-600' },
  caution: { label: 'Use with caution', colour: 'text-yellow-600' },
  no:      { label: 'Grounded', colour: 'text-red-600' },
};

const STATUS_TABS = [
  { value: 'all',       label: 'All' },
  { value: 'open',      label: 'Open' },
  { value: 'converted', label: 'Converted' },
  { value: 'resolved',  label: 'Resolved' },
];

export default async function BreakdownsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const status = searchParams.status ?? 'open';

  let query = supabase
    .from('breakdowns')
    .select(`
      id, title, urgency, can_continue, status, created_at, machine_name,
      reporter:profiles!reported_by(full_name),
      equipment:equipment(name)
    `)
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const { data: breakdowns } = await query;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Breakdowns</h2>
        <Link
          href="/breakdowns/new"
          className="flex items-center gap-1.5 bg-aas-blue text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> Report
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={`/breakdowns?status=${tab.value}`}
            className={`flex-1 text-center text-xs font-medium py-1.5 rounded-md transition-colors ${
              status === tab.value
                ? 'bg-white text-aas-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* List */}
      {!breakdowns?.length ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No {status === 'all' ? '' : status} breakdowns
        </div>
      ) : (
        <div className="space-y-2">
          {breakdowns.map((b: any) => {
            const urgency = URGENCY_STYLES[b.urgency] ?? URGENCY_STYLES.medium;
            const cont = CAN_CONTINUE_STYLES[b.can_continue] ?? CAN_CONTINUE_STYLES.yes;
            const machineName = (b.equipment as any)?.name ?? b.machine_name ?? 'Unknown machine';

            return (
              <Link
                key={b.id}
                href={`/breakdowns/${b.id}`}
                className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-aas-blue/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {b.status === 'converted' ? (
                      <ArrowRightLeft size={16} className="text-aas-blue" />
                    ) : b.status === 'resolved' ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : b.urgency === 'critical' ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <Circle size={16} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800 truncate">{b.title}</p>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${urgency.bg} ${urgency.text}`}>
                        {urgency.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{machineName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${cont.colour}`}>{cont.label}</span>
                      <span className="text-xs text-gray-400">
                        {(b.reporter as any)?.full_name} · {format(new Date(b.created_at), 'd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
