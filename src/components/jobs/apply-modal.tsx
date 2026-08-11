import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { applyToJob } from '@/lib/services'
import type { JobWithCompany } from '@/lib/services'

export function ApplyModal({
  open,
  onClose,
  job,
  onApplied,
}: {
  open: boolean
  onClose: () => void
  job: JobWithCompany
  onApplied?: () => void
}) {
  const [cover, setCover] = useState('')
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const { toast } = useToast()

  const mutation = useMutation({
    mutationFn: () => applyToJob(job.id, cover.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast(`Application sent to ${job.company?.name ?? 'the company'}`)
      setCover('')
      onApplied?.()
      onClose()
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not send application'),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (cover.trim().length < 1) {
      setError('Please add a short cover letter.')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Apply — ${job.title}`} description={job.company?.name}>
      <form onSubmit={submit}>
        <Label htmlFor="cover" required>
          Cover letter
        </Label>
        <Textarea
          id="cover"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          rows={6}
          placeholder="Tell them why you're a great fit…"
          aria-invalid={Boolean(error)}
        />
        {error && <p className="mt-1.5 text-sm font-medium text-destructive">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Submit application'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
