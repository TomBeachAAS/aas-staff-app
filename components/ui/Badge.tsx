import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-gray-100 text-gray-700',
  blue: 'bg-aas-blue-pale text-aas-blue',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function HolidayStatusBadge({ status }: { status: string }) {
  const map: Record<string, keyof typeof variants> = {
    pending: 'amber',
    approved: 'green',
    rejected: 'red',
    cancelled: 'default',
    change_requested: 'purple',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    change_requested: 'Change Requested',
  };
  return <Badge variant={map[status] ?? 'default'}>{labels[status] ?? status}</Badge>;
}

export function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, keyof typeof variants> = {
    planned: 'blue',
    not_started: 'default',
    in_progress: 'amber',
    completed: 'green',
    cancelled: 'default',
  };
  const labels: Record<string, string> = {
    planned: 'Planned',
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return <Badge variant={map[status] ?? 'default'}>{labels[status] ?? status}</Badge>;
}

export function ExpenseStatusBadge({ status }: { status: string }) {
  const map: Record<string, keyof typeof variants> = {
    draft: 'default',
    submitted: 'blue',
    approved: 'green',
    rejected: 'red',
    paid: 'purple',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  };
  return <Badge variant={map[status] ?? 'default'}>{labels[status] ?? status}</Badge>;
}
