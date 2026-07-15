import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Wrench, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { MapWrapper } from './MapWrapper';

export const dynamic = 'force-dynamic';

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManager = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: items } = await supabase
    .from('equipment')
    .select('*, last_locator:last_located_by(full_name)')
    .order('name');

  const equipment = items ?? [];
  const hasLocations = equipment.some(e => e.lat != null);

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Equipment</h2>
        {isManager && (
          <Link
            href="/equipment/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-aas-blue text-white rounded-lg text-sm font-medium"
          >
            <Plus size={14} /> Add
          </Link>
        )}
      </div>

      {hasLocations && <MapWrapper equipment={equipment} />}

      <div className="space-y-2">
        {equipment.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No equipment added yet.</p>
        )}
        {equipment.map(item => {
          const hasLocation = item.lat != null;
          const locator = (item.last_locator as any)?.full_name?.split(' ')[0];
          const updatedAt = item.location_updated_at
            ? format(new Date(item.location_updated_at), 'd MMM, HH:mm')
            : null;
          return (
            <Link
              key={item.id}
              href={'/equipment/' + item.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className={'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ' + (item.type === 'vehicle' ? 'bg-green-50' : 'bg-blue-50')}>
                {item.type === 'vehicle'
                  ? <Truck size={16} className="text-green-600" />
                  : <Wrench size={16} className="text-aas-blue" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                {hasLocation && updatedAt
                  ? <p className="text-xs text-gray-400">Updated {updatedAt}{locator ? ' by ' + locator : ''}</p>
                  : <p className="text-xs text-gray-300">No location set</p>}
              </div>
              <MapPin size={14} className={hasLocation ? 'text-aas-blue' : 'text-gray-200'} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
