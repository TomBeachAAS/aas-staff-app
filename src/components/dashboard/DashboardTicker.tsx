'use client';

interface TickerEvent {
  id: string;
  title?: string | null;
  event_type?: string | null;
}

interface DashboardTickerProps {
  events: TickerEvent[];
  nextTask?: string | null;
}

export function DashboardTicker({ events, nextTask }: DashboardTickerProps) {
  const parts: string[] = [];

  events.forEach(e => {
    const label = e.title || e.event_type?.replace(/_/g, ' ');
    if (label) parts.push('CALENDAR ' + label);
  });

  if (nextTask) {
    parts.push('LIGHTNING Next: ' + nextTask);
  }

  if (parts.length === 0) return null;

  // Build display text (replace placeholder tokens with symbols)
  const segment = parts
    .map(p => p.replace('CALENDAR ', '📅 ').replace('LIGHTNING ', '⚡ '))
    .join('     ·     ');

  const charLen = segment.length;
  const duration = Math.max(12, charLen * 0.18).toFixed(1) + 's';

  return (
    <>
      <style>{
        '@keyframes aas-ticker {' +
        '  from { transform: translateX(0); }' +
        '  to   { transform: translateX(-50%); }' +
        '}'
      }</style>
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
