/**
 * Small DTO->view-model helpers shared across the services layer's adapters
 * (jobs, applications) — kept here once instead of duplicated per file.
 */
import type { SalaryType } from '@/lib/api/types'

/** Decimal-as-string DTO field -> number, tolerating null. */
export const num = (v: string | null): number | null => (v == null ? null : Number(v))

/** Normalizes the salary_min/salary_max/salary_type DTO trio shared by
 * job-post-shaped payloads (job posts, application job summaries). */
export function normalizeSalary(
  min: string | null,
  max: string | null,
  type: SalaryType | '',
): { min: number | null; max: number | null; type: SalaryType | null } {
  return { min: num(min), max: num(max), type: type || null }
}
