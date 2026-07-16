'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CARD_ROUTES: [string, string][] = [
  ['bg-aas-blue', '/timesheets'],
  ['bg-green-500', '/holidays'],
  ['bg-red-500', '/sickness'],
  ['bg-violet-500', '/tasks'],
  ['bg-orange-500', '/jobs'],
  ['bg-yellow-500', '/expenses'],
];

export function ReportsCardLinks() {
  const router = useRouter();

  useEffect(() => {
    function attach() {
      let count = 0;
      for (const [bgClass, href] of CARD_ROUTES) {
        const card = document.querySelector<HTMLElement>('.' + bgClass + '.rounded-xl.p-4');
        if (card && !card.dataset.linked) {
          card.style.cursor = 'pointer';
          card.dataset.linked = '1';
          const h = href;
          card.addEventListener('click', () => router.push(h));
          count++;
        }
      }
      return count;
    }
    if (attach() < 6) {
      const t = setTimeout(attach, 1200);
      return () => clearTimeout(t);
    }
  }, [router]);

  return null;
}
