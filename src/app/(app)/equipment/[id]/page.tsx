import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Wrench, Truck, Pencil } from 'lucide-react';

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
  const locatorName: string | null = (item.last_locator as any)?.full_name ?? null;
  const hasLocation = item.lat != null && item.lng != null;
  const iconClass = 'w-10 h-10 rounded-xl flex items-center justify-center ' + (item.type === 'vehicle' ? 'bg-green-50' : 'bg-blue-50');
  const editHref = '/equipment/' + id + '/edit';
  const dirHref = hasLocation ? 'https://www.google.com/maps/dir/?api=1&destination=' + item.lat + ',' + item.lng : '#';
  const w3wKey = process.env.NEXT_PUBLIC_W3W_API_KEY ?? '';
  const locStatus = item.location_updated_at ? 'Last updated' + (locatorName ? ' by ' + locatorName.split(' ')[0] : '') : '';

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={iconClass}>
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
          <Link href={editHref} className="p-2 text-gray-400 hover:text-aas-blue transition-colors">
            <Pencil size={16} />
          </Link>
        )}
      </div>

      {item.description && (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-100 px-4 py-3">
          {item.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="relative">
          <div
            id="map-container"
            data-item-id={id}
            data-lat={item.lat != null ? String(item.lat) : ''}
            data-lng={item.lng != null ? String(item.lng) : ''}
            data-w3w-key={w3wKey}
            style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden' }}
          />
          <div id="drop-hint" style={{ display: 'none' }} className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-aas-blue text-white text-xs px-3 py-1.5 rounded-full shadow font-medium pointer-events-none">
            Tap map to place pin
          </div>
        </div>

        {/* What3Words display */}
        <div id="w3w-section" style={{ display: hasLocation ? 'flex' : 'none' }} className="items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-black text-sm">///</span>
            <span id="w3w-words" className="text-sm font-semibold text-gray-800">loading...</span>
          </div>
          <a id="w3w-link" href="#" target="_blank" rel="noopener noreferrer" className="text-xs text-aas-blue underline shrink-0">
            Open in W3W
          </a>
        </div>

        <p id="loc-status" style={{ display: hasLocation ? 'block' : 'none' }} className="text-xs text-gray-400 text-center">
          {locStatus}
        </p>
        <div id="note-section" style={{ display: 'none' }} className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-3">
          <input
            id="loc-note"
            type="text"
            placeholder="e.g. north field gate, or ///word.word.word"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          />
          <button id="save-btn" className="px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium">
            Save
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button id="gps-btn" className="flex items-center justify-center gap-2 py-3 bg-aas-blue text-white rounded-xl text-sm font-medium">
            I am here
          </button>
          <button id="pin-btn" className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-600">
            Drop pin
          </button>
          <a
            id="dir-btn"
            href={dirHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: hasLocation ? 'flex' : 'none' }}
            className="col-span-2 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-medium"
          >
            Get directions
          </a>
        </div>
        <p id="err-msg" style={{ display: 'none' }} className="text-sm text-red-500 text-center" />
      </div>

      <Link href="/equipment" className="text-sm text-aas-blue hover:underline">Back to equipment</Link>
      <Script src="/eq-map.js" strategy="afterInteractive" />
    </div>
  );
}
