import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = 'd MMM yyyy') {
  if (typeof date === 'string') return format(parseISO(date), fmt);
  return format(date, fmt);
}

export function getLeaveYear(date: Date = new Date()): number {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  // Leave year starts April (month 4)
  return month >= 4 ? year : year - 1;
}

export function getLeaveYearRange(leaveYear: number) {
  return {
    start: new Date(leaveYear, 3, 1),    // 1 Apr
    end: new Date(leaveYear + 1, 2, 31), // 31 Mar
  };
}

export const ROLE_LABELS: Record<string, string> = {
  administrator: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
  contractor: 'Contractor',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  disabled: 'Disabled',
};

export const HOLIDAY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  change_requested: 'Change Requested',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  mileage: 'Mileage',
  fuel: 'Fuel',
  hotels: 'Hotels',
  meals: 'Meals',
  flights: 'Flights',
  parking: 'Parking',
  tolls: 'Tolls',
  tools: 'Tools',
  parts: 'Parts',
  office: 'Office Purchases',
  entertainment: 'Customer Entertainment',
  other: 'Other',
};

export const CALENDAR_EVENT_COLOURS: Record<string, string> = {
  holiday: 'bg-green-100 text-green-800 border-green-200',
  sickness: 'bg-red-100 text-red-800 border-red-200',
  customer_visit: 'bg-blue-100 text-blue-800 border-blue-200',
  farm_work: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  site_work: 'bg-orange-100 text-orange-800 border-orange-200',
  office: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  home_working: 'bg-purple-100 text-purple-800 border-purple-200',
  travel: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  training: 'bg-pink-100 text-pink-800 border-pink-200',
  meeting: 'bg-violet-100 text-violet-800 border-violet-200',
  general_work: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const CALENDAR_EVENT_LABELS: Record<string, string> = {
  holiday: 'Annual Leave',
  sickness: 'Sickness',
  customer_visit: 'Customer Visit',
  farm_work: 'Farm Work',
  site_work: 'Site Work',
  office: 'Office',
  home_working: 'Home Working',
  travel: 'Travel',
  training: 'Training',
  meeting: 'Meeting',
  general_work: 'General Work',
};
