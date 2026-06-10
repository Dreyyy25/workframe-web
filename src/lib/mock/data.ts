/**
 * Seed data for the in-memory mock backend. Ported + expanded from the
 * validated prototype (`docs/prototype/assets/js/data.js`). Realistic copy,
 * no lorem. This module is the immutable source; `store.ts` clones it into a
 * mutable session store so "writes" (apply, withdraw, status changes) persist
 * for the session without touching these constants.
 */

import type {
  Applicant,
  Application,
  AppStatus,
  Company,
  DegreeType,
  Job,
  SeekerProfile,
  SkillLevel,
  CompanyStatus,
  Sex,
} from './types'

export const BUSINESS_STREAMS = [
  'Software',
  'Design',
  'Data & AI',
  'Marketing',
  'Finance',
  'Healthcare',
  'Operations',
  'Sales',
] as const

export const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'] as const

export const ENUMS = {
  appStatus: ['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn'] as AppStatus[],
  salaryType: ['hourly', 'monthly', 'yearly'] as const,
  skillLevel: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as SkillLevel[],
  degreeType: [
    'High School',
    'Associate',
    'Bachelor',
    'Master',
    'PhD',
    'Certificate',
    'Diploma',
  ] as DegreeType[],
  companyStatus: ['active', 'inactive', 'suspended'] as CompanyStatus[],
  sex: ['M', 'F', 'Other'] as Sex[],
}

export const COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Northwind Labs',
    stream: 'Software',
    website: 'northwind.dev',
    status: 'active',
    description:
      'A product studio building developer tooling that teams actually enjoy using. Small, senior, remote-first.',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=70',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=70',
    ],
    logo: 'NL',
  },
  {
    id: 'c2',
    name: 'Lumen Studio',
    stream: 'Design',
    website: 'lumen.studio',
    status: 'active',
    description:
      'An independent design practice shaping brands, products, and the systems that hold them together.',
    images: ['https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=900&q=70'],
    logo: 'LS',
  },
  {
    id: 'c3',
    name: 'Vertex Data',
    stream: 'Data & AI',
    website: 'vertexdata.ai',
    status: 'active',
    description:
      'Applied machine learning for logistics and forecasting. We turn messy operational data into decisions.',
    images: [],
    logo: 'VD',
  },
  {
    id: 'c4',
    name: 'Acme Health',
    stream: 'Healthcare',
    website: 'acmehealth.io',
    status: 'active',
    description:
      'Digital health infrastructure connecting clinics, patients, and payers on one secure platform.',
    images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=70'],
    logo: 'AH',
  },
  {
    id: 'c5',
    name: 'Quanta Finance',
    stream: 'Finance',
    website: 'quanta.finance',
    status: 'active',
    description:
      'Modern treasury and payments for growing businesses. Move money with confidence and clarity.',
    images: [],
    logo: 'QF',
  },
  {
    id: 'c6',
    name: 'Orbit Marketing',
    stream: 'Marketing',
    website: 'orbit.agency',
    status: 'active',
    description:
      'A full-funnel growth agency for ambitious consumer brands. Story first, performance always.',
    images: ['https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=900&q=70'],
    logo: 'OM',
  },
]

export const JOBS: Job[] = [
  {
    id: 'j1',
    companyId: 'c1',
    title: 'Senior Frontend Engineer',
    type: 'Full-time',
    city: 'Remote',
    country: '—',
    salaryMin: 120000,
    salaryMax: 150000,
    salaryType: 'yearly',
    deadline: '2026-07-15',
    posted: '2026-06-02',
    published: true,
    skills: [
      { name: 'React', level: 'Advanced', required: true },
      { name: 'TypeScript', level: 'Advanced', required: true },
      { name: 'Accessibility', level: 'Intermediate', required: false },
    ],
    description:
      'We are looking for a senior frontend engineer to own our component system and design-to-code pipeline. You will work closely with design, ship accessible interfaces, and mentor two mid-level engineers.',
  },
  {
    id: 'j2',
    companyId: 'c2',
    title: 'Product Designer',
    type: 'Full-time',
    city: 'Berlin',
    country: 'Germany',
    salaryMin: 70000,
    salaryMax: 90000,
    salaryType: 'yearly',
    deadline: '2026-07-01',
    posted: '2026-06-01',
    published: true,
    skills: [
      { name: 'Figma', level: 'Expert', required: true },
      { name: 'Design Systems', level: 'Advanced', required: true },
      { name: 'Prototyping', level: 'Intermediate', required: false },
    ],
    description:
      'Join a tight-knit studio team to design end-to-end product experiences for our clients. You will move fluidly between research, interaction design, and high-fidelity visuals.',
  },
  {
    id: 'j3',
    companyId: 'c3',
    title: 'Machine Learning Engineer',
    type: 'Full-time',
    city: 'Toronto',
    country: 'Canada',
    salaryMin: 130000,
    salaryMax: 175000,
    salaryType: 'yearly',
    deadline: '2026-07-20',
    posted: '2026-05-28',
    published: true,
    skills: [
      { name: 'Python', level: 'Expert', required: true },
      { name: 'PyTorch', level: 'Advanced', required: true },
      { name: 'MLOps', level: 'Intermediate', required: false },
    ],
    description:
      'Build and ship forecasting models that drive real logistics decisions. You will own problems end to end, from data pipelines to production inference.',
  },
  {
    id: 'j4',
    companyId: 'c4',
    title: 'Backend Engineer (Django)',
    type: 'Full-time',
    city: 'Remote',
    country: '—',
    salaryMin: 100000,
    salaryMax: 135000,
    salaryType: 'yearly',
    deadline: '2026-07-10',
    posted: '2026-05-30',
    published: true,
    skills: [
      { name: 'Python', level: 'Advanced', required: true },
      { name: 'Django', level: 'Advanced', required: true },
      { name: 'PostgreSQL', level: 'Intermediate', required: true },
    ],
    description:
      'Help scale our health platform API: design clean REST endpoints, harden security and compliance, and keep latency low under real clinical load.',
  },
  {
    id: 'j5',
    companyId: 'c5',
    title: 'DevOps Engineer',
    type: 'Full-time',
    city: 'London',
    country: 'UK',
    salaryMin: 110000,
    salaryMax: 140000,
    salaryType: 'yearly',
    deadline: '2026-06-30',
    posted: '2026-05-25',
    published: true,
    skills: [
      { name: 'Kubernetes', level: 'Advanced', required: true },
      { name: 'Terraform', level: 'Advanced', required: true },
      { name: 'AWS', level: 'Intermediate', required: true },
    ],
    description:
      'Own our cloud infrastructure and deployment pipelines. You will champion reliability, observability, and a calm on-call culture for a fintech moving real money.',
  },
  {
    id: 'j6',
    companyId: 'c6',
    title: 'Content Strategist',
    type: 'Full-time',
    city: 'New York',
    country: 'USA',
    salaryMin: 75000,
    salaryMax: 95000,
    salaryType: 'yearly',
    deadline: '2026-07-05',
    posted: '2026-06-03',
    published: true,
    skills: [
      { name: 'Editorial', level: 'Expert', required: true },
      { name: 'SEO', level: 'Advanced', required: false },
      { name: 'Analytics', level: 'Intermediate', required: false },
    ],
    description:
      'Shape the content engine for our consumer brands: editorial calendars, narrative campaigns, and the metrics that prove they work.',
  },
  {
    id: 'j7',
    companyId: 'c1',
    title: 'Frontend Engineer (Mid)',
    type: 'Full-time',
    city: 'Remote',
    country: '—',
    salaryMin: 85000,
    salaryMax: 110000,
    salaryType: 'yearly',
    deadline: '2026-07-18',
    posted: '2026-06-05',
    published: true,
    skills: [
      { name: 'React', level: 'Intermediate', required: true },
      { name: 'CSS', level: 'Advanced', required: true },
    ],
    description:
      'Build polished, accessible product UI alongside a senior team. A great spot to level up your craft in a remote-first studio.',
  },
  {
    id: 'j8',
    companyId: 'c3',
    title: 'Data Analyst',
    type: 'Contract',
    city: 'Toronto',
    country: 'Canada',
    salaryMin: 55,
    salaryMax: 75,
    salaryType: 'hourly',
    deadline: '2026-06-28',
    posted: '2026-06-04',
    published: true,
    skills: [
      { name: 'SQL', level: 'Advanced', required: true },
      { name: 'dbt', level: 'Intermediate', required: false },
      { name: 'Tableau', level: 'Intermediate', required: false },
    ],
    description:
      'A six-month contract to stand up our analytics layer: model the warehouse, build dashboards, and help the team trust its numbers.',
  },
  {
    id: 'j9',
    companyId: 'c2',
    title: 'UX Researcher',
    type: 'Part-time',
    city: 'Berlin',
    country: 'Germany',
    salaryMin: 45000,
    salaryMax: 60000,
    salaryType: 'yearly',
    deadline: '2026-07-12',
    posted: '2026-06-06',
    published: true,
    skills: [
      { name: 'Interviewing', level: 'Advanced', required: true },
      { name: 'Synthesis', level: 'Advanced', required: true },
    ],
    description:
      'Run lean research that actually changes decisions: recruit, interview, synthesize, and tell the story the team needs to hear.',
  },
  {
    id: 'j10',
    companyId: 'c4',
    title: 'Healthcare Data Engineer',
    type: 'Full-time',
    city: 'Remote',
    country: '—',
    salaryMin: 115000,
    salaryMax: 145000,
    salaryType: 'yearly',
    deadline: '2026-07-22',
    posted: '2026-06-07',
    published: true,
    skills: [
      { name: 'Python', level: 'Advanced', required: true },
      { name: 'Airflow', level: 'Intermediate', required: true },
      { name: 'HL7/FHIR', level: 'Beginner', required: false },
    ],
    description:
      'Build the pipelines that move clinical data safely and reliably. Compliance-minded engineering with real patient impact.',
  },
  {
    id: 'j11',
    companyId: 'c5',
    title: 'Product Manager, Payments',
    type: 'Full-time',
    city: 'London',
    country: 'UK',
    salaryMin: 95000,
    salaryMax: 125000,
    salaryType: 'yearly',
    deadline: '2026-07-08',
    posted: '2026-06-08',
    published: true,
    skills: [
      { name: 'Product Strategy', level: 'Advanced', required: true },
      { name: 'Payments', level: 'Intermediate', required: true },
    ],
    description:
      'Own the payments roadmap end to end. Talk to customers, sharpen the strategy, and ship money-movement features teams rely on.',
  },
  {
    id: 'j12',
    companyId: 'c6',
    title: 'Growth Marketing Intern',
    type: 'Internship',
    city: 'New York',
    country: 'USA',
    salaryMin: 25,
    salaryMax: 30,
    salaryType: 'hourly',
    deadline: '2026-06-25',
    posted: '2026-06-09',
    published: false,
    skills: [
      { name: 'Copywriting', level: 'Beginner', required: false },
      { name: 'Analytics', level: 'Beginner', required: false },
    ],
    description:
      'A paid internship for someone hungry to learn performance marketing from the inside. Real campaigns, real budgets, real mentorship.',
  },
]

/** The signed-in job seeker used for demo + seeker screens. */
export const SEEKER: SeekerProfile = {
  id: 's1',
  firstName: 'Maya',
  lastName: 'Okafor',
  email: 'maya.okafor@example.com',
  contact: '+1 (415) 555-0142',
  goals:
    'Senior frontend engineer who cares about accessible, well-crafted interfaces. Looking for a remote-first team building something with real depth.',
  resumeUrl: 'https://example.com/maya-okafor-resume.pdf',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  dob: '1994-03-21',
  sex: 'F',
  education: [
    {
      id: 'e1',
      school: 'University of Lagos',
      degree: 'Bachelor',
      field: 'Computer Science',
      start: '2012-09',
      end: '2016-06',
      percentage: 84,
    },
  ],
  experience: [
    {
      id: 'x1',
      company: 'Brightframe',
      position: 'Frontend Engineer',
      city: 'Remote',
      country: '—',
      start: '2020-01',
      end: '',
      description:
        'Lead the design-system rebuild in React + TypeScript; cut UI defects by 40% and onboarded three engineers.',
    },
    {
      id: 'x2',
      company: 'Pixelware',
      position: 'Junior Developer',
      city: 'Lagos',
      country: 'Nigeria',
      start: '2016-08',
      end: '2019-12',
      description:
        'Shipped marketing sites and internal tools; grew from intern to owning the company component library.',
    },
  ],
  skills: [
    { id: 'sk1', name: 'React', level: 'Expert' },
    { id: 'sk2', name: 'TypeScript', level: 'Advanced' },
    { id: 'sk3', name: 'Accessibility', level: 'Advanced' },
    { id: 'sk4', name: 'CSS', level: 'Expert' },
  ],
}

/** Applications the seeker has already submitted. */
export const APPLICATIONS: Application[] = [
  {
    id: 'a1',
    jobId: 'j1',
    status: 'reviewed',
    applied: '2026-06-03',
    cover:
      'I have spent the last four years owning component systems and would love to bring that craft to Northwind Labs.',
  },
  {
    id: 'a2',
    jobId: 'j7',
    status: 'pending',
    applied: '2026-06-06',
    cover:
      'A mid-level role on a senior, remote-first team is exactly the environment I do my best work in.',
  },
  {
    id: 'a3',
    jobId: 'j4',
    status: 'accepted',
    applied: '2026-05-31',
    cover:
      'Strong Python and Django background, and I care deeply about the compliance side of health software.',
  },
]

/** The signed-in demo company. */
export const COMPANY_ACCOUNT_ID = 'c1'

/** Candidates who applied to the demo company's (c1) posts. */
export const APPLICANTS: Applicant[] = [
  {
    id: 'ap1',
    jobId: 'j1',
    name: 'Daniel Reyes',
    title: 'Senior Frontend Engineer',
    status: 'pending',
    applied: '2026-06-04',
    email: 'daniel.reyes@example.com',
    cover:
      'Eight years building design systems at scale. I lead with accessibility and care about the details users never notice.',
    skills: ['React', 'TypeScript', 'Design Systems', 'Accessibility'],
    experienceYears: 8,
  },
  {
    id: 'ap2',
    jobId: 'j1',
    name: 'Priya Nair',
    title: 'Frontend Engineer',
    status: 'reviewed',
    applied: '2026-06-05',
    email: 'priya.nair@example.com',
    cover:
      'I love turning ambiguous design into resilient, well-tested UI. Northwind’s tooling focus really resonates with me.',
    skills: ['React', 'TypeScript', 'Testing'],
    experienceYears: 5,
  },
  {
    id: 'ap3',
    jobId: 'j7',
    name: 'Marcus Lee',
    title: 'Frontend Developer',
    status: 'pending',
    applied: '2026-06-07',
    email: 'marcus.lee@example.com',
    cover:
      'Three years in and hungry to grow on a senior team. I ship polished UI and ask a lot of good questions.',
    skills: ['React', 'CSS', 'JavaScript'],
    experienceYears: 3,
  },
]
