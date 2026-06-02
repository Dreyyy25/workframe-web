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
