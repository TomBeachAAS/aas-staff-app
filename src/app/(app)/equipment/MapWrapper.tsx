'use client';

import { EquipmentMapView } from './EquipmentMapView';

interface Item {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null; location_notes: string | null;
}

export function MapWrapper({ equipment }: { equipment: Item[] }) {
  return <EquipmentMapView equipment={equipment} />;
}
