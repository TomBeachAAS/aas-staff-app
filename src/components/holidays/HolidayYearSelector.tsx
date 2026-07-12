'use client';

export function HolidayYearSelector({ currentYear, options }: { currentYear: number; options: number[] }) {
  return (
    <select
      defaultValue={String(currentYear)}
      onChange={e => { window.location.href = `/holidays?year=${e.target.value}`; }}
      className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
    >
      {options.map(y => (
        <option key={y} value={y}>{y}/{y + 1}</option>
      ))}
    </select>
  );
}
