import { Suspense } from 'react';
import { LeaveIndicatorBanner } from '@/components/timesheets/LeaveIndicatorBanner';

export default function TimesheetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Suspense>
        <LeaveIndicatorBanner />
      </Suspense>
    </>
  );
}
