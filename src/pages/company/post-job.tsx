import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import {
  JobSaveError, SALARY_TYPES, SKILL_LEVELS, getCompanyJob, listJobTypeOptions, saveJob,
} from '@/lib/services'
import type { CompanyJobInput, CompanyJobSkillRow, SalaryType, SkillLevel } from '@/lib/services'
import { ApiError } from '@/lib/api/client'
import { useToast } from '@/components/ui/toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

interface Form {
  title: string
  description: string
  typeId: string
  city: string
  country: string
  salaryMin: string
  salaryMax: string
  salaryType: SalaryType | ''
  deadline: string
  published: boolean
  skills: CompanyJobSkillRow[]
}

const EMPTY: Form = {
  title: '',
  description: '',
  typeId: '',
  city: '',
  country: '',
  salaryMin: '',
  salaryMax: '',
  salaryType: '',
  deadline: '',
  published: true,
  skills: [],
}

/** DRF field names -> form field names, for mapping ApiError.fieldErrors onto inputs. */
const FIELD_ERROR_MAP: Record<string, keyof Form> = {
  job_title: 'title',
  job_description: 'description',
  job_type: 'typeId',
  salary_min: 'salaryMin',
  salary_max: 'salaryMax',
  salary_type: 'salaryType',
  deadline_date: 'deadline',
  city: 'city',
  country: 'country',
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-sm font-medium text-destructive" role="alert">
      {message}
    </p>
  )
}

export default function PostJob() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  const [form, setForm] = useState<Form>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const { data: existing, isLoading } = useQuery({
    queryKey: ['company-job', id],
    queryFn: () => getCompanyJob(id as string),
    enabled: isEdit,
  })

  const { data: jobTypes = [] } = useQuery({
    queryKey: ['job-type-options'],
    queryFn: listJobTypeOptions,
  })

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        typeId: existing.typeId,
        city: existing.city,
        country: existing.country,
        salaryMin: existing.salaryMin?.toString() ?? '',
        salaryMax: existing.salaryMax?.toString() ?? '',
        salaryType: existing.salaryType ?? '',
        deadline: existing.deadline ?? '',
        published: existing.published,
        skills: existing.skillRows,
      })
    }
  }, [existing])

  // Create mode: once job types load, default the empty select to the first option.
  useEffect(() => {
    if (!isEdit && !form.typeId && jobTypes.length > 0) {
      set('typeId', jobTypes[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, form.typeId, jobTypes])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['company-jobs'] })
    qc.invalidateQueries({ queryKey: ['company-console'] })
    if (isEdit) qc.invalidateQueries({ queryKey: ['company-job', id] })
  }

  const toInput = (): CompanyJobInput => ({
    title: form.title,
    description: form.description,
    typeId: form.typeId,
    city: form.city,
    country: form.country,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryType: form.salaryType || null,
    deadline: form.deadline || null,
    published: form.published,
    skills: form.skills.filter((s) => s.name.trim()),
  })

  const save = useMutation({
    mutationFn: () => saveJob(toInput(), isEdit ? existing ?? undefined : undefined),
    onSuccess: () => {
      invalidate()
      toast(isEdit ? 'Job updated' : 'Job posted')
      navigate('/company/jobs')
    },
    onError: (err) => {
      if (err instanceof JobSaveError) {
        invalidate()
        qc.invalidateQueries({ queryKey: ['company-job', err.jobId] })
        toast('Job saved, but some skills failed — review and retry')
        if (!isEdit) navigate(`/company/jobs/${err.jobId}/edit`)
        return
      }
      // fieldErrors is ALWAYS assigned ({} for {detail}/{error} bodies) — guard on
      // non-empty, or every 500/403 dies silently in this branch.
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        const next: Record<string, string> = {}
        for (const [k, msgs] of Object.entries(err.fieldErrors)) {
          next[FIELD_ERROR_MAP[k] ?? k] = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
        }
        setFieldErrors(next)
        return
      }
      toast('Could not save the job — try again')
    },
  })

  const addSkillRow = () =>
    set('skills', [...form.skills, { id: null, name: '', level: 'Intermediate', required: true }])
  const updateSkillRow = (i: number, patch: Partial<CompanyJobSkillRow>) =>
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
          setFieldErrors({})
          save.mutate()
        }}
        className="mt-8 space-y-6"
      >
        <div className="rounded border-2 border-border bg-card p-6">
          <div>
            <Label htmlFor="j-title" required>
              Title
            </Label>
            <Input
              id="j-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
              required
            />
            <FieldError message={fieldErrors.title} />
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
              aria-invalid={Boolean(fieldErrors.description)}
              required
            />
            <FieldError message={fieldErrors.description} />
          </div>
        </div>

        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="j-type">Job type</Label>
              <Select id="j-type" value={form.typeId} onChange={(e) => set('typeId', e.target.value)}>
                {jobTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.typeId} />
            </div>
            <div>
              <Label htmlFor="j-deadline">Deadline</Label>
              <Input
                id="j-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                aria-invalid={Boolean(fieldErrors.deadline)}
              />
              <FieldError message={fieldErrors.deadline} />
            </div>
            <div>
              <Label htmlFor="j-city" required>
                City
              </Label>
              <Input
                id="j-city"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                aria-invalid={Boolean(fieldErrors.city)}
                required
              />
              <FieldError message={fieldErrors.city} />
            </div>
            <div>
              <Label htmlFor="j-country" required>
                Country
              </Label>
              <Input
                id="j-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                aria-invalid={Boolean(fieldErrors.country)}
                required
              />
              <FieldError message={fieldErrors.country} />
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
                aria-invalid={Boolean(fieldErrors.salaryMin)}
              />
              <FieldError message={fieldErrors.salaryMin} />
            </div>
            <div>
              <Label htmlFor="j-max">Salary max</Label>
              <Input
                id="j-max"
                type="number"
                value={form.salaryMax}
                onChange={(e) => set('salaryMax', e.target.value)}
                aria-invalid={Boolean(fieldErrors.salaryMax)}
              />
              <FieldError message={fieldErrors.salaryMax} />
            </div>
            <div>
              <Label htmlFor="j-stype">Salary type</Label>
              <Select
                id="j-stype"
                value={form.salaryType}
                onChange={(e) => set('salaryType', e.target.value as SalaryType | '')}
              >
                <option value="">Not specified</option>
                {SALARY_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldErrors.salaryType} />
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
                    disabled={s.id !== null}
                  />
                </div>
                <div className="w-40">
                  <Label htmlFor={`sk-lvl-${i}`}>Level</Label>
                  <Select
                    id={`sk-lvl-${i}`}
                    value={s.level}
                    onChange={(e) => updateSkillRow(i, { level: e.target.value as SkillLevel })}
                  >
                    {SKILL_LEVELS.map((l) => (
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
