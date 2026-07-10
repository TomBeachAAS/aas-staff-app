import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function LocationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: locations } = await supabase
    .from('locations')
    .select('*, customer:customers(company_name)')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Work locations</h2>
        {isManagerOrAdmin && (
          <Link href="/locations/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark">
            <Plus size={16} />
            Add location
          </Link>
        )}
      </div>

      <Card>
        <div className="divide-y divide-gray-50">
          {(locations ?? []).length === 0 ? (
            <div className="text-center py-10 text-sm text-gray-400">No locations yet</div>
          ) : (
            (locations ?? []).map(l => {
              const customer = l.customer as {company_name: string} | undefined;
              return (
                <Link key={l.id} href={`/locations/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{l.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {customer?.company_name}{customer && l.postcode ? ' · ' : ''}{l.postcode}
                    </p>
                  </div>
                  {l.latitude && l.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${l.latitude},${l.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-aas-blue shrink-0 hover:underline"
                    >
                      Maps
                    </a>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
