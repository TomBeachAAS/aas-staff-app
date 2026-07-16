import { ReportsCardLinks } from '@/components/reports/ReportsCardLinks';

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ReportsCardLinks />
    </>
  );
}
