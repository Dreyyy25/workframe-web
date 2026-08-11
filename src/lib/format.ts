import type { SalaryType } from './api/types'

export function money(
  min: number | null,
  max: number | null,
  type: SalaryType | null,
): string | null {
  if (min == null && max == null) return null
  const suffix = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : '/yr'
  const fmt = (n: number) => (type === 'hourly' ? `$${n}` : `$${Math.round(n / 1000)}k`)
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)} ${suffix}`
  return `${fmt((min ?? max) as number)} ${suffix}`
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "2026-06-03" -> "Jun 3, 2026". Parsed as date-only to avoid TZ drift. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m) return iso
  return d ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`
}

/** "2012-09" -> "Sep 2012"; empty -> "Present". */
export function formatMonthYear(yyyymm: string | null | undefined): string {
  if (!yyyymm) return 'Present'
  const [y, m] = yyyymm.split('-').map(Number)
  if (!y || !m) return yyyymm
  return `${MONTHS[m - 1]} ${y}`
}

export function dateRange(start: string, end: string): string {
  return `${formatMonthYear(start)} – ${formatMonthYear(end)}`
}

/** Location label from city/country, tolerating the "—" placeholder country. */
export function place(city: string, country: string): string {
  if (!country || country === '—') return city
  return `${city}, ${country}`
}
