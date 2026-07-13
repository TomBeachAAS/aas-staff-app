import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Truck, Cog } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: allVehicles } = await supabase.from('vehicles').select('*').eq('is_active', true).order('name');
  const { data: equipment } = await supabase.from('equipment').select('*').eq('is_active', true).order('name');

  const vehicles = (allVehicles ?? []).filter((v: any) => v.type !== 'machine');
  const machines = (allVehicles ?? []).filter((v: any) => v.type === 'machine');

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Vehicles &amp; Machines</h2>
        {isManagerOrAdmin && (
          <Link href="/vehicles/new" className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
            <Plus size={16} />
            Add
          </Link>
        )}
      </div>

      {vehicles.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Vehicles</p>
          <Card>
            <div className="divide-y divide-gray-50">
              {vehicles.map((v: any) => (
                <Link key={v.id} href={'/vehicles/' + v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <Truck size={16} className="text-aas-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{v.name}</p>
                    {(v.registration || v.make || v.model) && (
                      <p className="text-xs text-gray-400">{[v.registration, v.make, v.model].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}

      {machines.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Machines</p>
          <Card>
            <div className="divide-y divide-gray-50">
              {machines.map((v: any) => (
                <Link key={v.id} href={'/vehicles/' + v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <Cog size={16} className="text-purple-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{v.name}</p>
                    {(v.make || v.model) && (
                      <p className="text-xs text-gray-400">{[v.make, v.model].filter(Boolean).join(' ')}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}

      {(equipment ?? []).length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipment</p>
          <Card>
            <div className="divide-y divide-gray-50">
              {(equipment ?? []).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-aas-blue shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.name}</p>
                    {e.type && <p className="text-xs text-gray-400">{e.type}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {vehicles.length === 0 && machines.length === 0 && (equipment ?? []).length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">No vehicles or machines yet</div>
      )}
    </div>
  );
}
