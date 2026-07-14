'use client';

import { useRouter } from 'next/navigation';
import { Check, Clock, AlertCircle, ChevronRight } from 'lucide-react';

interface StaffRow {
  userId: string;
  name: string;
  status: 'not_started' | 'draft' | 'submitted' | 'approved';
}

interface Props {
  staff: StaffRow[];
  weekStartStr: string;
  currentUserId: string;
}

const STATUS = {
  not_started: { label: 'Not started', text: 'text-gray-400', bg: 'bg-gray-100', Icon: null },
  draft:       { label: 'In progress', text: 'text-blue-600', bg: 'bg-blue-50',  Icon: Clock },
  submitted:   { label: 'Awaiting approval', text: 'text-amber-600', bg: 'bg-amber-50', Icon: AlertCircle },
  approved:    { label: 'Approved', text: 'text-green-600', bg: 'bg-green-50', Icon: Check },
};

export function TimesheetStaffOverview({ staff, weekStartStr, currentUserId }: Props) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-sm font-semibold text-gray-700">Team timesheets</p>
      </div>
      <div className="divide-y divide-gray-50">
        {staff.map(person => {
          const { label, text, bg, Icon } = STATUS[person.status];
          return (
            <button
              key={person.userId}
              onClick={() => router.push(`/timesheets?week=${weekStartStr}&user=${person.userId}`)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-aas-blue">
                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {person.name}
                  {person.userId === currentUserId && (
                    <span className="text-xs text-gray-400 ml-1">(you)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${bg} ${text}`}>
                  {Icon && <Icon size={10} />}
                  {label}
                </span>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
