import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Building2, MapPin, Clock, Receipt,
  Navigation, BarChart3, Settings, Bell, LogOut, Stethoscope, UserCircle, Wrench, Umbrella
} from 'lucide-react';
import { logout } from '@/lib/auth-actions';

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isManagerOrAdmin = ['administrator', 'manager'].includes(profile.role);
  const isAdmin = profile.role === 'administrator';

  const sections = [
    {
      title: 'General',
      items: [
        { href: '/holidays', icon: Umbrella, label: 'Holidays' },
        { href: '/sickness', icon: Stethoscope, label: 'Sickness' },
        { href: '/equipment', icon: Wrench, label: 'Equipment' },
        { href: '/notifications', icon: Bell, label: 'Notifications' },
        { href: '/account', icon: UserCircle, label: 'My account' },
      ],
    },
    ...(isManagerOrAdmin ? [{
      title: 'Management',
      items: [
        { href: '/staff', icon: Users, label: 'Staff' },
        { href: '/customers', icon: Building2, label: 'Customers' },
        { href: '/locations', icon: MapPin, label: 'Locations' },
      ],
    }] : []),
    {
      title: 'Finance',
      items: [
        ...(profile.timesheet_access ? [{ href: '/timesheets', icon: Clock, label: 'Timesheets' }] : []),
        ...(profile.expenses_access ? [{ href: '/expenses', icon: Receipt, label: 'Expenses' }] : []),
        ...(profile.expenses_access ? [{ href: '/mileage', icon: Navigation, label: 'Mileage' }] : []),
      ],
    },
    ...(isManagerOrAdmin ? [{
      title: 'Admin',
      items: [
        { href: '/reports', icon: BarChart3, label: 'Reports' },
        ...(isAdmin ? [{ href: '/settings', icon: Settings, label: 'Settings' }] : []),
      ],
    }] : []),
  ];

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {sections.map(section => (
        <div key={section.title}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{section.title}</p>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {section.items.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-aas-blue-50 transition-colors"
              >
                <Icon size={18} className="text-aas-blue shrink-0" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-sm font-medium text-gray-800">{profile.full_name}</p>
          <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
