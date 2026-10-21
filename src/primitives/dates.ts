import type { DateRange, PartialDate } from '@/domain';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function formatDate(d: PartialDate): string {
  const [y = '', m] = d.split('-');
  const month = m === undefined ? undefined : MONTHS[Number(m) - 1];
  return month ? `${month} ${y}` : y;
}

/** "Jan 2020 – Present", "2019 – 2021", "Mar 2018". `present` is the theme's word for an open end. */
export function formatDateRange(r: DateRange, present = 'Present'): string {
  const start = r.start ? formatDate(r.start) : '';
  const end = r.end === 'present' ? present : r.end ? formatDate(r.end) : '';
  return [start, end].filter(Boolean).join(' – ');
}
