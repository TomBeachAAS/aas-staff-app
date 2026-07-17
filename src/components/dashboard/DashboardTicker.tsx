'use client';

interface TickerEvent {
  id: string;
  title?: string | null;
  event_type?: string | null;
}

interface TickerTask {
  id: string;
  title: string;
  task_date?: string | null;
}

interface DashboardTickerProps {
  events: TickerEvent[];
  overdueTasks?: TickerTask[];
  todayTasks?: TickerTask[];
}

export function DashboardTicker({ events, overdueTasks = [], todayTasks = [] }: DashboardTickerProps) {
  const parts: string[] = [];

  events.forEach(e => {
    const label = e.title || e.event_type?.replace(/_/g, ' ');
    if (label) parts.push('\uD83D\uDCC5 ' + label);
  });

  overdueTasks.forEach(t => {
    parts.push('\uD83D\uDD34 Overdue: ' + t.title);
  });

  todayTasks.forEach(t => {
    parts.push('\u26A1 ' + t.title);
  });

  if (parts.length === 0) return null;

  const segment = parts.join('  \u00B7  ');
  const charLen = segment.length;
  const duration = Math.max(12, charLen * 0.18).toFixed(1) + 's';

  return (
    <>
      <style>{`@keyframes aas-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div className="bg-aas-blue rounded-xl overflow-hidden flex items-center h-9">
        <div className="bg-aas-blue-dark px-3 h-full flex items-center shrink-0">
          <span className="text-white text-xs font-black tracking-widest uppercase">Today</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            className="flex whitespace-nowrap"
            style={{ animation: 'aas-ticker ' + duration + ' linear infinite' }}
          >
            <span className="text-white text-xs font-semibold px-6">{segment}</span>
            <span className="text-white text-xs font-semibold px-6" aria-hidden>{segment}</span>
          </div>
        </div>
      </div>
    </>
  );
}
