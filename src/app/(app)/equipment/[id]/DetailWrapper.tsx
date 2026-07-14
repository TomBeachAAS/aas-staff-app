'use client';
import dynamic from 'next/dynamic';

const Detail = dynamic(() => import('./EquipmentDetailClient').then(m => m.EquipmentDetailClient), {
  ssr: false,
  loading: () => <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />,
});

interface Item {
  id: string; name: string; type: string;
  lat: number | null; lng: number | null;
  location_notes: string | null;
  location_updated_at: string | null;
  last_locator_name: string | null;
}

export function DetailWrapper({ item, userId }: { item: Item; userId: string }) {
  return <Detail item={item} userId={userId} />;
}  
