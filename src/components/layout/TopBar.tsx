'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import type { Profile } from '@/types/database';

interface TopBarProps {
  profile: Profile;
  title?: string;
  unreadCount?: number;
}

export function TopBar({ profile, title, unreadCount = 0 }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3">
      {/* Mobile logo */}
      <div className="lg:hidden shrink-0">
        <Image src="/logo.png" alt="AAS" width={120} height={36} className="object-contain h-8 w-auto" />
      </div>

      <h1 className="flex-1 text-base font-semibold text-gray-800 truncate lg:block hidden">
        {title ?? 'Staff Portal'}
      </h1>
      <div className="flex-1 lg:hidden" />

      {/* Notification bell */}
      <Link href="/notifications" className="relative p-1.5 text-gray-500 hover:text-aas-blue transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-aas-blue flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">
          {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </span>
      </div>
    </header>
  );
}
