export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type SalaryType = 'hourly' | 'monthly' | 'yearly'

/** Mirrors apps/jobs JobPost serializer. FKs are serialized as UUID strings. */
export interface JobPost {
  id: string
  company: string
  job_type: string
  job_location: string
  job_title: string
  job_description: string
  salary_min: number | null
  salary_max: number | null
  salary_type: SalaryType | null
  deadline_date: string | null
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JobType {
  id: string
  job_type_name: string
  description: string | null
}

export interface JobLocation {
  id: string
  street_address: string | null
  city: string
  country: string
  zip: string | null
  country_code: string | null
}

export interface BusinessStream {
  id: string
  business_stream_name: string
}
