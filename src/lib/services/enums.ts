/**
 * Form-option enums for the company console (salary type, skill level, sex,
 * degree type). Values match the backend's choices. `appStatus`/
 * `companyStatus` are not carried over here (no surviving consumer for
 * either as an option list).
 */
import type { DegreeType, SalaryType, Sex, SkillLevel } from './types'

export const SALARY_TYPES: readonly SalaryType[] = ['hourly', 'monthly', 'yearly']

export const SKILL_LEVELS: readonly SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

export const SEX_OPTIONS: readonly Sex[] = ['M', 'F', 'Other']

export const DEGREE_TYPES: readonly DegreeType[] = [
  'High School',
  'Associate',
  'Bachelor',
  'Master',
  'PhD',
  'Certificate',
  'Diploma',
]
