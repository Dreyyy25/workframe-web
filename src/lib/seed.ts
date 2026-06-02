/** Offline / fallback content so the landing page always renders something real-looking,
 *  even when the API is unreachable (or returns nothing). */

export const SEED_STREAMS = [
  'Software',
  'Design',
  'Data & AI',
  'Marketing',
  'Finance',
  'Healthcare',
  'Operations',
  'Sales',
]

export interface JobCardData {
  id: string
  title: string
  company?: string
  location: string
  type: string
  salary: string | null
}

export const SEED_FEATURED: JobCardData[] = [
  { id: 's1', title: 'Senior Frontend Engineer', company: 'Northwind Labs', location: 'Remote', type: 'Full-time', salary: '$120k–150k /yr' },
  { id: 's2', title: 'Product Designer', company: 'Lumen Studio', location: 'Berlin, Germany', type: 'Full-time', salary: '$70k–90k /yr' },
  { id: 's3', title: 'Machine Learning Engineer', company: 'Vertex Data', location: 'Toronto, Canada', type: 'Full-time', salary: '$130k–175k /yr' },
  { id: 's4', title: 'Backend Engineer (Django)', company: 'Acme Health', location: 'Remote', type: 'Full-time', salary: '$100k–135k /yr' },
  { id: 's5', title: 'DevOps Engineer', company: 'Quanta Finance', location: 'London, UK', type: 'Full-time', salary: '$110k–140k /yr' },
  { id: 's6', title: 'Content Strategist', company: 'Orbit Marketing', location: 'New York, USA', type: 'Full-time', salary: '$75k–95k /yr' },
]
