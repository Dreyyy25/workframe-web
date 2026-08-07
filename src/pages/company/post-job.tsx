import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { createJob, getCompanyJob, updateJob } from '@/lib/mock/services'
import type { JobInput } from '@/lib/mock/services'
import { ENUMS, JOB_TYPES } from '@/lib/mock/data'
import type { JobSkill, SalaryType, SkillLevel } from '@/lib/mock/types'
import { useToast } from '@/components/ui/toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

type Form = Omit<JobInput, 'salaryMin' | 'salaryMax' | 'salaryType' | 'deadline'> & {
  salaryMin: string
  salaryMax: string
  salaryType: SalaryType
  deadline: string
}

const EMPTY: Form = {
  title: '',
  type: 'Full-time',
  city: '',
  country: '',
  salaryMin: '',
  salaryMax: '',
  salaryType: 'yearly',
  deadline: '',
  published: true,
  skills: [],
  description: '',
}

export default function PostJob() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState<Form>(EMPTY)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const { data: existing, isLoading } = useQuery({
    queryKey: ['company-job', id],
    queryFn: () => getCompanyJob(id as string),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        type: existing.type,
        city: existing.city,
        country: existing.country,
        salaryMin: existing.salaryMin?.toString() ?? '',
        salaryMax: existing.salaryMax?.toString() ?? '',
        // TODO(slice-4): drop these fallbacks when the console moves off mock data — a real null here should surface, not default.
        salaryType: existing.salaryType ?? 'yearly',
        deadline: existing.deadline ?? '',
        published: existing.published,
        skills: existing.skills,
        description: existing.description,
      })
    }
  }, [existing])

  const toInput = (): JobInput => ({
    title: form.title,
    type: form.type,
    city: form.city,
    country: form.country || '—',
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryType: form.salaryType,
    deadline: form.deadline,
    published: form.published,
    skills: form.skills.filter((s) => s.name.trim()),
    description: form.description,
  })

  const save = useMutation({
    mutationFn: () => (isEdit ? updateJob(id as string, toInput()) : createJob(toInput())),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-jobs'] })
      qc.invalidateQueries({ queryKey: ['company-stats'] })
      toast(isEdit ? 'Job updated' : 'Job posted')
      navigate('/company/jobs')
    },
  })

  const addSkillRow = () =>
    set('skills', [...form.skills, { name: '', level: 'Intermediate', required: true }])
  const updateSkillRow = (i: number, patch: Partial<JobSkill>) =>
    set(
      'skills',
      form.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    )
  const removeSkillRow = (i: number) =>
    set('skills', form.skills.filter((_, idx) => idx !== i))

  if (isEdit && isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Job Posts', to: '/company/jobs' },
          { label: isEdit ? 'Edit job' : 'Post a job' },
        ]}
      />
      <h1 className="mt-4 text-3xl font-extrabold tracking-tightest">
        {isEdit ? 'Edit job' : 'Post a job'}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="mt-8 space-y-6"
      >
        <div className="rounded border-2 border-border bg-card p-6">
          <div>
            <Label htmlFor="j-title" required>
              Title
            </Label>
            <Input id="j-title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>
          <div className="mt-4">
            <Label htmlFor="j-desc" required>
              Description
            </Label>
            <Textarea
              id="j-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={5}
              required
            />
          </div>
        </div>

        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="j-type">Job type</Label>
              <Select id="j-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="j-deadline">Deadline</Label>
              <Input
                id="j-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="j-city">City</Label>
              <Input id="j-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="j-country">Country</Label>
              <Input
                id="j-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Compensation</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="j-min">Salary min</Label>
              <Input
                id="j-min"
                type="number"
                value={form.salaryMin}
                onChange={(e) => set('salaryMin', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="j-max">Salary max</Label>
              <Input
                id="j-max"
                type="number"
                value={form.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="j-stype">Salary type</Label>
              <Select
                id="j-stype"
                value={form.salaryType}
                onChange={(e) => set('salaryType', e.target.value as SalaryType)}
              >
                {ENUMS.salaryType.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* skills repeater */}
        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Required skills</h2>
          <div className="mt-4 space-y-3">
            {form.skills.map((s, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px] flex-1">
                  <Label htmlFor={`sk-${i}`}>Skill</Label>
                  <Input
                    id={`sk-${i}`}
                    value={s.name}
                    onChange={(e) => updateSkillRow(i, { name: e.target.value })}
                  />
                </div>
                <div className="w-40">
                  <Label htmlFor={`sk-lvl-${i}`}>Level</Label>
                  <Select
                    id={`sk-lvl-${i}`}
                    value={s.level}
                    onChange={(e) => updateSkillRow(i, { level: e.target.value as SkillLevel })}
                  >
                    {ENUMS.skillLevel.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="flex h-11 items-center gap-2 text-sm font-medium">
                  <Checkbox
                    checked={s.required}
                    onChange={(e) => updateSkillRow(i, { required: e.target.checked })}
                  />
                  Required
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove skill"
                  onClick={() => removeSkillRow(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" className="mt-4" onClick={addSkillRow}>
            <Plus className="h-4 w-4" /> Add skill
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={form.published}
              onChange={(e) => set('published', e.target.checked)}
            />
            Publish immediately
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/company/jobs')}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Publish job'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
