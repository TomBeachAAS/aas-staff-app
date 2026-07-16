import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  sub?: string;
  href?: string;
}

export function StatCard({ label, value, icon: Icon, iconColor = 'text-aas-blue', iconBg = 'bg-aas-blue-pale', sub, href }: StatCardProps) {
  const inner = (
    <div className={cn(
      'bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3',
      href && 'hover:border-gray-200 hover:shadow-md transition-all'
    )}>
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}
