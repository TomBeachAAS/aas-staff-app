'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, CheckSquare, ClipboardList, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/jobs', icon: ClipboardList, label: 'Jobs' },
  { href: '/more', icon: MoreHorizontal, label: 'More' },
];

// Routes covered by the main nav tabs — anything else highlights "More"
const PRIMARY_PREFIXES = ['/dashboard', '/calendar', '/tasks', '/jobs', '/more'];

export function BottomNav() {
  const pathname = usePathname();

  // If the current path doesn't start with any primary prefix, "More" is active
  const isMoreActive =
    !PRIMARY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-40">
      <div className="flex">
        {items.map(({ href, icon: Icon, label }) => {
          let active: boolean;
          if (href === '/more') {
            active = isMoreActive || pathname === '/more' || pathname.startsWith('/more/');
          } else {
            active = pathname === href || pathname.startsWith(href + '/');
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-aas-blue' : 'text-gray-400'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
