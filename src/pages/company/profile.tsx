import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import {
  addCompanyImage,
  getCompanyProfile,
  removeCompanyImage,
  updateCompanyProfile,
} from '@/lib/mock/services'
import { BUSINESS_STREAMS, ENUMS } from '@/lib/mock/data'
import type { Company, CompanyStatus } from '@/lib/mock/types'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export default function CompanyProfile() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: company, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: getCompanyProfile,
  })

  const [form, setForm] = useState<Company | null>(null)
  useEffect(() => setForm(company ?? null), [company])

  const [uploadOpen, setUploadOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['company-profile'] })

  const save = useMutation({
    mutationFn: () =>
      updateCompanyProfile({
        name: form?.name,
        stream: form?.stream,
        status: form?.status,
        website: form?.website,
        description: form?.description,
      }),
    onSuccess: () => {
      refresh()
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
    mutationFn: (url: string) => removeCompanyImage(url),
    onSuccess: () => {
      refresh()
      toast('Image removed')
    },
  })

  if (isLoading || !form) {
    return <Skeleton className="h-96 w-full" />
  }

  const set = <K extends keyof Company>(k: K, v: Company[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f))

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
            <Select id="c-stream" value={form.stream} onChange={(e) => set('stream', e.target.value)}>
              {BUSINESS_STREAMS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="c-status">Status</Label>
            <Select
              id="c-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as CompanyStatus)}
            >
              {ENUMS.companyStatus.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </Select>
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

      {form.images.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {form.images.map((src) => (
            <figure key={src} className="group relative overflow-hidden rounded border-2 border-border">
              <img src={src} alt="Workplace" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => removeImg.mutate(src)}
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
