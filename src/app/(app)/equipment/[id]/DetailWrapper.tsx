'use client';

import { EquipmentDetailClient } from './EquipmentDetailClient';

interface Item {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null;
  location_notes: string | null;
  location_updated_at: string | null;
  last_locator_name: string | null;
}

export function DetailWrapper({ item, userId }: { item: Item; userId: string }) {
  return <EquipmentDetailClient item={item} userId={userId} />;
}
