'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Umbrella, Stethoscope, CheckSquare,
  Users, Building2, MapPin, Truck, Clock, Receipt, Navigation,
  BarChart3, Settings, Bell, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/lib/auth-actions';
import { useState } from 'react';
import type { Profile } from '@/types/database';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/holidays', icon: Umbrella, label: 'Holidays' },
  { href: '/sickness', icon: Stethoscope, label: 'Sickness' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
];

const managerItems = [
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/customers', icon: Building2, label: 'Customers' },
  { href: '/locations', icon: MapPin, label: 'Locations' },
  { href: '/vehicles', icon: Truck, label: 'Vehicles' },
];

const adminItems = [
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isAdmin = profile.role === 'administrator';

  function NavItem({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active ? 'bg-aas-blue text-white' : 'text-gray-600 hover:bg-aas-blue-pale hover:text-aas-blue'
        )}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  }

  function SectionLabel({ label }: { label: string }) {
    if (collapsed) return <div className="border-t border-gray-100 my-1" />;
    return <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">{label}</p>;
  }

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen bg-white border-r border-gray-100 transition-all duration-200 shrink-0',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        {collapsed ? (
          <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            <Image src="/logo.png" alt="AAS" width={32} height={32} className="object-contain" />
          </div>
        ) : (
          <div className="flex-1 min-w-0 bg-white rounded-lg px-2 py-1.5">
            <Image src="/logo.png" alt="Autonomous Agri Solutions" width={180} height={48} className="object-contain w-full h-10" />
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gray-600 shrink-0">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(item => <NavItem key={item.href} {...item} />)}

        {isManagerOrAdmin && (
          <>
            <SectionLabel label="Management" />
            {managerItems.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}

        <SectionLabel label="Finance" />
        {profile.timesheet_access && <NavItem href="/timesheets" icon={Clock} label="Timesheets" />}
        {profile.expenses_access && <NavItem href="/expenses" icon={Receipt} label="Expenses" />}
        {profile.expenses_access && <NavItem href="/mileage" icon={Navigation} label="Mileage" />}

        {isAdmin && (
          <>
            <SectionLabel label="Admin" />
            {adminItems.map(item => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-0.5">
        <NavItem href="/notifications" icon={Bell} label="Notifications" />
        <form action={logout}>
          <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-800 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-400 truncate capitalize">{profile.role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
