import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import {
  addEducation,
  addExperience,
  addSkill,
  deleteEducation,
  deleteExperience,
  deleteSkill,
  getSeekerProfile,
  updateSeekerProfile,
} from '@/lib/services'
import type { DegreeType, SeekerProfile, SkillLevel } from '@/lib/services'
import { ENUMS } from '@/lib/mock/data'
import { useAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dateRange } from '@/lib/format'

export default function SeekerProfilePage() {
  const [tab, setTab] = useState('overview')
  const { data: profile, isLoading } = useQuery({
    queryKey: ['seeker-profile'],
    queryFn: getSeekerProfile,
  })

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar src={profile.photo} fallback={profile.firstName[0] + profile.lastName[0]} size={72} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tightest">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{profile.goals}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab profile={profile} />
          </TabsContent>
          <TabsContent value="education">
            <EducationTab profile={profile} />
          </TabsContent>
          <TabsContent value="experience">
            <ExperienceTab profile={profile} />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsTab profile={profile} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

/* -------------------------------- Overview ------------------------------- */

function OverviewTab({ profile }: { profile: SeekerProfile }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const [form, setForm] = useState(profile)
  useEffect(() => setForm(profile), [profile])

  const save = useMutation({
    mutationFn: () =>
      updateSeekerProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        contact: form.contact,
        goals: form.goals,
        resumeUrl: form.resumeUrl,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seeker-profile'] })
      toast('Profile updated')
      void refreshUser()
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })

  const set = (k: keyof SeekerProfile, v: string) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
      className="rounded border-2 border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <Label htmlFor="contact">Contact</Label>
        <Input id="contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} />
      </div>
      <div className="mt-4">
        <Label htmlFor="goals">Career goals</Label>
        <Textarea id="goals" value={form.goals} onChange={(e) => set('goals', e.target.value)} rows={3} />
      </div>
      <div className="mt-4">
        <Label htmlFor="resume">Résumé URL</Label>
        <Input id="resume" value={form.resumeUrl} onChange={(e) => set('resumeUrl', e.target.value)} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

/* ------------------------------- Education ------------------------------- */

function EducationTab({ profile }: { profile: SeekerProfile }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    school: '',
    degree: 'Bachelor' as DegreeType,
    field: '',
    start: '',
    end: '',
    percentage: '',
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['seeker-profile'] })
  const add = useMutation({
    mutationFn: () =>
      addEducation({
        school: form.school,
        degree: form.degree,
        field: form.field,
        start: form.start,
        end: form.end,
        percentage: form.percentage ? Number(form.percentage) : null,
      }),
    onSuccess: () => {
      refresh()
      toast('Education added')
      setOpen(false)
      setForm({ school: '', degree: 'Bachelor', field: '', start: '', end: '', percentage: '' })
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteEducation(id),
    onSuccess: () => {
      refresh()
      toast('Education removed')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })

  return (
    <div>
      <div className="space-y-3">
        {profile.education.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-4 rounded border-2 border-border bg-card p-5">
            <div>
              <p className="font-display text-base font-bold tracking-tight">{e.school}</p>
              <p className="text-sm text-muted-foreground">
                {e.degree} · {e.field}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dateRange(e.start, e.end)}
                {e.percentage != null && ` · ${e.percentage}%`}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove.mutate(e.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {profile.education.length === 0 && (
          <p className="text-sm text-muted-foreground">No education added yet.</p>
        )}
      </div>
      <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add education
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add education">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="e-school" required>
              School
            </Label>
            <Input
              id="e-school"
              value={form.school}
              onChange={(ev) => setForm((f) => ({ ...f, school: ev.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="e-degree">Degree</Label>
              <Select
                id="e-degree"
                value={form.degree}
                onChange={(ev) => setForm((f) => ({ ...f, degree: ev.target.value as DegreeType }))}
              >
                {ENUMS.degreeType.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="e-field">Field</Label>
              <Input
                id="e-field"
                value={form.field}
                onChange={(ev) => setForm((f) => ({ ...f, field: ev.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="e-start">Start</Label>
              <Input
                id="e-start"
                type="month"
                value={form.start}
                onChange={(ev) => setForm((f) => ({ ...f, start: ev.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="e-end">End</Label>
              <Input
                id="e-end"
                type="month"
                value={form.end}
                onChange={(ev) => setForm((f) => ({ ...f, end: ev.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="e-pct">%</Label>
              <Input
                id="e-pct"
                type="number"
                value={form.percentage}
                onChange={(ev) => setForm((f) => ({ ...f, percentage: ev.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ------------------------------ Experience ------------------------------- */

function ExperienceTab({ profile }: { profile: SeekerProfile }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const empty = { position: '', company: '', city: '', country: '', start: '', end: '', description: '' }
  const [form, setForm] = useState(empty)

  const refresh = () => qc.invalidateQueries({ queryKey: ['seeker-profile'] })
  const add = useMutation({
    mutationFn: () => addExperience(form),
    onSuccess: () => {
      refresh()
      toast('Experience added')
      setOpen(false)
      setForm(empty)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteExperience(id),
    onSuccess: () => {
      refresh()
      toast('Experience removed')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })

  return (
    <div>
      <div className="space-y-3">
        {profile.experience.map((x) => (
          <div key={x.id} className="flex items-start justify-between gap-4 rounded border-2 border-border bg-card p-5">
            <div>
              <p className="font-display text-base font-bold tracking-tight">
                {x.position} · {x.company}
              </p>
              <p className="text-sm text-muted-foreground">
                {[x.city, x.country].filter((v) => v && v !== '—').join(', ')} · {dateRange(x.start, x.end)}
              </p>
              {x.description && <p className="mt-2 text-sm text-foreground/80">{x.description}</p>}
            </div>
            <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove.mutate(x.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {profile.experience.length === 0 && (
          <p className="text-sm text-muted-foreground">No experience added yet.</p>
        )}
      </div>
      <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add experience
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add experience">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="x-pos" required>
              Position
            </Label>
            <Input
              id="x-pos"
              value={form.position}
              onChange={(ev) => setForm((f) => ({ ...f, position: ev.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="x-co">Company</Label>
            <Input
              id="x-co"
              value={form.company}
              onChange={(ev) => setForm((f) => ({ ...f, company: ev.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="x-city">City</Label>
              <Input
                id="x-city"
                value={form.city}
                onChange={(ev) => setForm((f) => ({ ...f, city: ev.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="x-country">Country</Label>
              <Input
                id="x-country"
                value={form.country}
                onChange={(ev) => setForm((f) => ({ ...f, country: ev.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="x-start">Start</Label>
              <Input
                id="x-start"
                type="month"
                value={form.start}
                onChange={(ev) => setForm((f) => ({ ...f, start: ev.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="x-end">End (blank = current)</Label>
              <Input
                id="x-end"
                type="month"
                value={form.end}
                onChange={(ev) => setForm((f) => ({ ...f, end: ev.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="x-desc">Description</Label>
            <Textarea
              id="x-desc"
              value={form.description}
              onChange={(ev) => setForm((f) => ({ ...f, description: ev.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* -------------------------------- Skills --------------------------------- */

function SkillsTab({ profile }: { profile: SeekerProfile }) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [level, setLevel] = useState<SkillLevel>('Intermediate')

  const refresh = () => qc.invalidateQueries({ queryKey: ['seeker-profile'] })
  const add = useMutation({
    mutationFn: () => addSkill({ name, level }),
    onSuccess: () => {
      refresh()
      toast('Skill added')
      setOpen(false)
      setName('')
      setLevel('Intermediate')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteSkill(id),
    onSuccess: refresh,
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {profile.skills.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-2 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold"
          >
            {s.name}
            <span className="text-xs font-medium text-muted-foreground">{s.level}</span>
            <button
              type="button"
              aria-label={`Remove ${s.name}`}
              onClick={() => remove.mutate(s.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        {profile.skills.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills added yet.</p>
        )}
      </div>
      <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add skill
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add skill">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) add.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="s-name" required>
              Skill
            </Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="s-level">Level</Label>
            <Select
              id="s-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as SkillLevel)}
            >
              {ENUMS.skillLevel.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
