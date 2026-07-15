import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Wrench, Truck, Pencil } from 'lucide-react';
import { DetailWrapper } from '@/components/equipment/DetailWrapper';

export const dynamic = 'force-dynamic';

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManager = ['administrator', 'manager'].includes(profile?.role ?? '');

  const { data: item } = await supabase
    .from('equipment')
    .select('*, last_locator:last_located_by(full_name)')
    .eq('id', id)
    .single();

  if (!item) notFound();

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            item.type === 'vehicle' ? 'bg-green-50' : 'bg-blue-50'
          }`}>
            {item.type === 'vehicle'
              ? <Truck size={18} className="text-green-600" />
              : <Wrench size={18} className="text-aas-blue" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{item.name}</h2>
            <p className="text-xs text-gray-400 capitalize">{item.type}</p>
          </div>
        </div>
        {isManager && (
          <Link href={`/equipment/${id}/edit`} className="p-2 text-gray-400 hover:text-aas-blue transition-colors">
            <Pencil size={16} />
          </Link>
        )}
      </div>

      {item.description && (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-3">
          {item.description}
        </p>
      )}

      <DetailWrapper
        item={{
          id: item.id,
          name: item.name,
          type: item.type,
          lat: item.lat,
          lng: item.lng,
          location_notes: item.location_notes,
          location_updated_at: item.location_updated_at,
          last_locator_name: (item.last_locator as any)?.full_name ?? null,
        }}
        userId={user.id}
      />

      <Link href="/equipment" className="text-sm text-aas-blue hover:underline">← Back to equipment</Link>
    </div>
  );
}
