import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import {
  addCompanyImage,
  getCompanyConsole,
  removeCompanyImage,
  updateCompanyProfile,
} from '@/lib/services'
import type { CompanyStatus } from '@/lib/services'
import { listStreamOptions } from '@/lib/services/meta'
import { useAuth } from '@/lib/auth/auth-context'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

interface ProfileForm {
  name: string
  streamId: string
  status: CompanyStatus
  website: string
  description: string
}

export default function CompanyProfile() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { refreshUser } = useAuth()
  const { data: console_, isLoading } = useQuery({
    queryKey: ['company-console'],
    queryFn: getCompanyConsole,
  })
  const { data: streams } = useQuery({ queryKey: ['stream-options'], queryFn: listStreamOptions })

  const [form, setForm] = useState<ProfileForm | null>(null)
  useEffect(() => {
    setForm(
      console_
        ? {
            name: console_.name,
            streamId: console_.streamId,
            status: console_.status,
            website: console_.website,
            description: console_.description,
          }
        : null,
    )
  }, [console_])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['company-console'] })

  const save = useMutation({
    mutationFn: () =>
      updateCompanyProfile(console_!.companyId, {
        name: form!.name,
        streamId: form!.streamId,
        status: form!.status,
        website: form!.website,
        description: form!.description,
      }),
    onSuccess: () => {
      refresh()
      void refreshUser() // topbar shows the company name — a rename must reach the session
      toast('Company profile saved')
    },
  })
  const addImg = useMutation({
    mutationFn: () => addCompanyImage(imageUrl.trim()),
    onSuccess: () => {
      refresh()
      toast('Image added')
      setUploadOpen(false)
      setImageUrl('')
    },
  })
  const removeImg = useMutation({
    mutationFn: (imageId: string) => removeCompanyImage(imageId),
    onSuccess: () => {
      refresh()
      toast('Image removed')
    },
  })

  if (isLoading || !console_ || !form) {
    return <Skeleton className="h-96 w-full" />
  }

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f))

  const suspended = console_.status === 'suspended'

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tightest">Company profile</h1>
      <p className="mt-2 text-muted-foreground">How candidates see your company.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          save.mutate()
        }}
        className="mt-8 rounded border-2 border-border bg-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-name" required>
              Company name
            </Label>
            <Input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="c-stream" required>
              Business stream
            </Label>
            <Select id="c-stream" value={form.streamId} onChange={(e) => set('streamId', e.target.value)}>
              {(streams ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Visibility</Label>
            {suspended ? (
              <div className="flex items-center gap-2 rounded border-2 border-warning bg-warning/10 px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-[1.5px] border-warning px-2.5 py-1 text-xs font-semibold text-warning">
                  <ShieldAlert className="h-3 w-3" />
                  Suspended by admin
                </span>
                <span className="text-sm text-muted-foreground">
                  Contact support to restore your listing.
                </span>
              </div>
            ) : (
              <label className="mt-3 flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={form.status === 'active'}
                  onChange={(e) => set('status', e.target.checked ? 'active' : 'inactive')}
                />
                Visible in the public directory
              </label>
            )}
          </div>
          <div>
            <Label htmlFor="c-web">Website</Label>
            <Input id="c-web" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Label htmlFor="c-desc">Description</Label>
          <Textarea
            id="c-desc"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={4}
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      {/* gallery */}
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Workplace photos</h2>
        <Button variant="outline" onClick={() => setUploadOpen(true)}>
          <ImagePlus className="h-4 w-4" /> Upload image
        </Button>
      </div>

      {console_.images.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {console_.images.map((img) => (
            <figure key={img.id} className="group relative overflow-hidden rounded border-2 border-border">
              <img src={img.url} alt="Workplace" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => removeImg.mutate(img.id)}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded border-2 border-border bg-background text-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={ImagePlus}
            title="No photos yet"
            description="Add a few photos to show candidates your workplace."
          />
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Add image">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (imageUrl.trim()) addImg.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="img-url" required>
              Image URL
            </Label>
            <Input
              id="img-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addImg.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
