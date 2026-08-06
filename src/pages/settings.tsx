import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSeekerProfile, updateSeekerProfile } from '@/lib/mock/services'
import { ENUMS } from '@/lib/mock/data'
import type { Sex } from '@/lib/mock/types'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export default function Settings() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['seeker-profile'],
    queryFn: getSeekerProfile,
  })

  const [account, setAccount] = useState({ email: '', contact: '', dob: '', sex: 'F' as Sex, photo: '' })
  useEffect(() => {
    if (profile)
      setAccount({
        email: profile.email,
        contact: profile.contact,
        dob: profile.dob,
        sex: profile.sex,
        photo: profile.photo,
      })
  }, [profile])

  const saveAccount = useMutation({
    mutationFn: () =>
      updateSeekerProfile({
        email: account.email,
        contact: account.contact,
        dob: account.dob,
        sex: account.sex,
        photo: account.photo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seeker-profile'] })
      toast('Account updated')
    },
  })

  // password section (local validation only — no backend)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next.length < 10) return setPwError('New password must be at least 10 characters.')
    if (pw.next !== pw.confirm) return setPwError('Passwords don’t match.')
    setPwError('')
    setPw({ current: '', next: '', confirm: '' })
    toast('Password changed')
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tightest">Account settings</h1>
      <p className="mt-2 text-muted-foreground">Manage your account details and password.</p>

      {/* profile */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveAccount.mutate()
        }}
        className="mt-8 rounded border-2 border-border bg-card p-6"
      >
        <h2 className="font-display text-lg font-bold tracking-tight">Profile</h2>

        <div className="mt-4 flex items-center gap-4">
          <Avatar src={account.photo} fallback="ME" size={56} />
          <div className="flex-1">
            <Label htmlFor="s-photo">Photo URL</Label>
            <Input
              id="s-photo"
              value={account.photo}
              onChange={(e) => setAccount((a) => ({ ...a, photo: e.target.value }))}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="s-email">Email</Label>
            <Input
              id="s-email"
              type="email"
              value={account.email}
              onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="s-contact">Contact number</Label>
            <Input
              id="s-contact"
              value={account.contact}
              onChange={(e) => setAccount((a) => ({ ...a, contact: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="s-dob">Date of birth</Label>
            <Input
              id="s-dob"
              type="date"
              value={account.dob}
              onChange={(e) => setAccount((a) => ({ ...a, dob: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="s-sex">Sex</Label>
            <Select
              id="s-sex"
              value={account.sex}
              onChange={(e) => setAccount((a) => ({ ...a, sex: e.target.value as Sex }))}
            >
              {ENUMS.sex.map((s) => (
                <option key={s} value={s}>
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saveAccount.isPending}>
            {saveAccount.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      {/* password */}
      <form onSubmit={submitPassword} className="mt-6 rounded border-2 border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">Password</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="pw-current">Current password</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pw-next">New password</Label>
              <Input
                id="pw-next"
                type="password"
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                aria-invalid={Boolean(pwError)}
              />
            </div>
            <div>
              <Label htmlFor="pw-confirm">Confirm new password</Label>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                aria-invalid={Boolean(pwError)}
              />
            </div>
          </div>
          {pwError && <p className="text-sm font-medium text-destructive">{pwError}</p>}
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="outline">
            Change password
          </Button>
        </div>
      </form>
    </div>
  )
}
