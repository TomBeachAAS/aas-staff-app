'use client';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./EquipmentMapView').then(m => m.EquipmentMapView), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />,
});

interface Item {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null; location_notes: string | null;
}

export function MapWrapper({ equipment }: { equipment: Item[] }) {
  return <Map equipment={equipment} />;
}
