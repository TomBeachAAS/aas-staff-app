'use client';
// Thin wrapper that overrides initialView on mobile (< 640px) to 'week'
// so the calendar doesn't open in month view on small screens.
import { useMemo } from 'react';
import { CalendarView } from './CalendarView';
import type { Profile, BankHoliday } from '@/types/database';

interface Props {
  currentUserId: string;
  profile: Profile;
  initialView: 'day' | 'week' | 'month' | 'timeline';
  initialDate: string;
  allStaff: Pick<Profile, 'id' | 'full_name' | 'role'>[] | null;
  bankHolidays: BankHoliday[];
}

export function MobileCalendarView(props: Props) {
  const effectiveView = useMemo<'day' | 'week' | 'month' | 'timeline'>(() => {
    if (
      props.initialView === 'month' &&
      typeof window !== 'undefined' &&
      window.innerWidth < 640
    ) {
      return 'week';
    }
    return props.initialView;
  }, [props.initialView]);

  return <CalendarView {...props} initialView={effectiveView} />;
}
