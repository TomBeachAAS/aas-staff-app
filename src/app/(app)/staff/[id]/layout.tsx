import { StaffPermissions } from '@/components/staff/StaffPermissions';

export default function StaffDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StaffPermissions />
    </>
  );
}
