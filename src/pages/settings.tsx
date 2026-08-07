import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, getSeekerProfile, updateSeekerProfile } from '@/lib/services'
import type { Sex } from '@/lib/services'
import { ENUMS } from '@/lib/mock/data'
import { useAuth } from '@/lib/auth/auth-context'
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
  const { isSeeker } = useAuth()
  // The profile form (and its dashboard-backed query) is seeker-only — a
  // company account has no seeker profile, so gate the query and skip
  // straight to just the password card for non-seekers.
  const { data: profile, isLoading } = useQuery({
    queryKey: ['seeker-profile'],
    queryFn: getSeekerProfile,
    enabled: isSeeker,
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
        contact: account.contact,
        dob: account.dob,
        sex: account.sex,
        photo: account.photo,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seeker-profile'] })
      toast('Account updated')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong'),
  })

  // password section
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const changePw = useMutation({
    mutationFn: () => changePassword(pw.current, pw.next),
    onSuccess: () => {
      setPw({ current: '', next: '', confirm: '' })
      setPwError('')
      toast('Password changed')
    },
    onError: (err) => setPwError(err instanceof Error ? err.message : 'Could not change password'),
  })

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return setPwError('Passwords don’t match.')
    setPwError('')
    changePw.mutate()
  }

  if (isSeeker && isLoading) {
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

      {/* profile — seeker-only; a company account has no seeker profile */}
      {isSeeker ? (
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
              <Input id="s-email" type="email" value={account.email} readOnly disabled />
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
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Profile details are managed from your company profile.
        </p>
      )}

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
          <Button type="submit" variant="outline" disabled={changePw.isPending}>
            Change password
          </Button>
        </div>
      </form>
    </div>
  )
}
