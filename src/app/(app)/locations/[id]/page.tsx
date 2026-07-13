import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Phone, MapPin, Navigation, ExternalLink, Car, ShieldAlert, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

function buildMapsUrl(lat: any, lng: any, address: string) {
  if (lat && lng) return 'https://www.google.com/maps?q=' + lat + ',' + lng;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
}

function buildNavUrl(lat: any, lng: any, address: string) {
  if (lat && lng) return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(address);
}

function cleanW3W(raw: string | null) {
  if (!raw) return null;
  return raw.startsWith('///') ? raw.slice(3) : raw;
}

export default async function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isManager = ['administrator', 'manager'].includes(viewer?.role ?? '');

  const { data: loc } = await supabase
    .from('locations')
    .select('*, customer:customers(id, company_name)')
    .eq('id', id)
    .single();
  if (!loc) notFound();

  const addressParts = [loc.address_line1, loc.address_line2, loc.town, loc.county, loc.postcode, loc.country].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const mapsUrl = buildMapsUrl(loc.latitude, loc.longitude, fullAddress);
  const navUrl = buildNavUrl(loc.latitude, loc.longitude, fullAddress);
  const w3wClean = cleanW3W(loc.what3words);
  const w3wUrl = w3wClean ? 'https://what3words.com/' + w3wClean : null;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/locations" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{loc.name}</h2>
            {loc.customer && (
              <p className="text-xs text-gray-400">{loc.customer.company_name}</p>
            )}
          </div>
        </div>
        {isManager && (
          <Link
            href={'/locations/' + id + '/edit'}
            className="flex items-center gap-1.5 px-3 py-2 bg-aas-blue text-white rounded-lg text-sm font-medium"
          >
            <Pencil size={14} />
            Edit
          </Link>
        )}
      </div>

      {(fullAddress || (loc.latitude && loc.longitude)) && (
        <div className="grid grid-cols-2 gap-3">
          
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium"
          >
            <MapPin size={16} />
            View on map
          </a>
          
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-medium"
          >
            <Navigation size={16} />
            Navigate
          </a>
        </div>
      )}

      {w3wUrl && (
        
          href={w3wUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <span className="text-red-600 font-bold text-lg leading-none">///</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400">What3Words</p>
            <p className="text-sm font-medium text-gray-800">{'///' + w3wClean}</p>
          </div>
          <ExternalLink size={14} className="text-gray-400" />
        </a>
      )}

      {fullAddress && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Address</p>
          <p className="text-sm text-gray-800">{fullAddress}</p>
          {loc.latitude && loc.longitude && (
            <p className="text-xs text-gray-400 mt-1">{loc.latitude}, {loc.longitude}</p>
          )}
        </div>
      )}

      {(loc.site_contact || loc.site_phone) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
          <p className="text-xs text-gray-400">Site contact</p>
          {loc.site_contact && <p className="text-sm font-medium text-gray-800">{loc.site_contact}</p>}
          {loc.site_phone && (
            <a href={'tel:' + loc.site_phone} className="flex items-center gap-2 text-sm text-aas-blue">
              <Phone size={14} />
              {loc.site_phone}
            </a>
          )}
        </div>
      )}

      {(loc.access_notes || loc.parking_notes) && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car size={14} className="text-gray-400" />
            <p className="text-xs text-gray-400">Access & parking</p>
          </div>
          {loc.access_notes && <p className="text-sm text-gray-700 whitespace-pre-wrap">{loc.access_notes}</p>}
          {loc.parking_notes && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{loc.parking_notes}</p>}
        </div>
      )}

      {loc.health_safety_notes && (
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-amber-600" />
            <p className="text-xs text-amber-600 font-medium">Health & safety</p>
          </div>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{loc.health_safety_notes}</p>
        </div>
      )}

      {loc.general_notes && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-gray-400" />
            <p className="text-xs text-gray-400">General notes</p>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{loc.general_notes}</p>
        </div>
      )}

    </div>
  );
}
