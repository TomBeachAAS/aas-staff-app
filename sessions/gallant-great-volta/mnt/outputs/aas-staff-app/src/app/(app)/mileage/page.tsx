import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function MileagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const { data: claims } = await supabase
    .from('mileage_claims')
    .select('*')
    .eq('user_id', user.id)
    .order('claim_date', { ascending: false })
    .limit(50);

  const { data: rateRow } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', 'mileage_rate_per_mile')
    .single();
  const rate = parseFloat(rateRow?.value ?? '0.45');

  const totalOwed = (claims ?? [])
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + Number(c.calculated_amount), 0);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Mileage</h2>
        <Link href="/mileage/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
          <Plus size={16} />
          New claim
        </Link>
      </div>

      <div className="bg-aas-blue-pale rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-aas-blue font-medium">Company rate</p>
          <p className="text-sm font-bold text-aas-blue-dark">{rate}p per mile</p>
        </div>
        {totalOwed > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Approved (unpaid)</p>
            <p className="text-sm font-bold text-gray-800">£{totalOwed.toFixed(2)}</p>
          </div>
        )}
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(claims ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No mileage claims</div>
          ) : (
            (claims ?? []).map(c => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.from_location} → {c.to_location}</p>
                    <p className="text-xs text-gray-400">{c.business_reason}</p>
                    <p className="text-xs text-gray-400">{format(new Date(c.claim_date), 'd MMM yyyy')} · {Number(c.distance_miles).toFixed(1)} miles</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-800">£{Number(c.calculated_amount).toFixed(2)}</p>
                    <ExpenseStatusBadge status={c.status} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
