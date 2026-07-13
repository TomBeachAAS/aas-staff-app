import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Receipt } from 'lucide-react';
import { MileageActions } from '@/components/expenses/MileageActions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ExpenseStatusBadge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function MileageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile?.expenses_access) redirect('/dashboard');

  const { data: claim, error } = await supabase.from('mileage_claims').select('*').eq('id', id).single();
  if (error || !claim) redirect('/mileage');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isOwner = claim.user_id === user.id;
  if (!isOwner && !isManagerOrAdmin) redirect('/mileage');

  let ownerName = '';
  if (isManagerOrAdmin && !isOwner) {
    const { data: ownerProfile } = await supabase.from('profiles').select('full_name').eq('id', claim.user_id).single();
    ownerName = ownerProfile?.full_name ?? '';
  }

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/mileage" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <h2 className="text-lg font-bold text-gray-800">Mileage claim</h2>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-800">{claim.from_location} → {claim.to_location}</p>
              {isManagerOrAdmin && !isOwner && ownerName && <p className="text-xs text-gray-500 mt-0.5">{ownerName}</p>}
            </div>
            <ExpenseStatusBadge status={claim.status} />
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Amount</p>
              <p className="font-bold text-gray-800 text-lg">{'£' + Number(claim.calculated_amount).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-gray-700">{format(new Date(claim.claim_date), 'd MMM yyyy')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Distance</p>
              <p className="text-gray-700">{Number(claim.distance_miles).toFixed(1)} miles</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Rate</p>
              <p className="text-gray-700">{claim.rate_per_mile}p / mile</p>
            </div>
            {claim.vehicle_reg && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Vehicle</p>
                <p className="text-gray-700">{claim.vehicle_reg}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-0.5">Business reason</p>
            <p className="text-sm text-gray-700">{claim.business_reason}</p>
          </div>

          {claim.notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700">{claim.notes}</p>
            </div>
          )}

          {claim.reviewed_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Reviewed</p>
              <p className="text-sm text-gray-500">{format(new Date(claim.reviewed_at), 'd MMM yyyy, HH:mm')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {claim.receipt_url ? (
        <Card>
          <CardHeader><CardTitle>Proof / receipt</CardTitle></CardHeader>
          <CardContent className="pb-4">
            <a href={claim.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
              <img src={claim.receipt_url} alt="Receipt" className="w-full rounded-lg border border-gray-100 object-contain max-h-72 bg-gray-50" />
              <p className="text-xs text-aas-blue mt-2 text-center">Tap to open full size</p>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-400 px-1">
          <Receipt size={14} /><span>No receipt attached</span>
        </div>
      )}

      <MileageActions claimId={claim.id} status={claim.status} isOwner={isOwner} isManagerOrAdmin={isManagerOrAdmin} managerNotes={claim.manager_notes ?? null} />
    </div>
  );
}
