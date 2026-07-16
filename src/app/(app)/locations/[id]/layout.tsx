import { LocationTasks } from '@/components/locations/LocationTasks';

export default function LocationDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LocationTasks />
    </>
  );
}
