import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ProfileSaveError, useAuth } from '@/lib/auth/auth-context'
import { registerErrors } from './auth-errors'
import type { RegisterFieldErrors } from './auth-errors'
import { getBusinessStreams } from '@/lib/api/public'
import { useToast } from '@/components/ui/toast'
import type { UserType } from '@/lib/mock/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export default function Register() {
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [role, setRole] = useState<UserType>('job_seeker')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [streamId, setStreamId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<RegisterFieldErrors>({})

  const streamsQuery = useQuery({
    queryKey: ['business-streams'],
    queryFn: () => getBusinessStreams(),
    enabled: role === 'company',
  })
  const streams = streamsQuery.data?.results ?? []
  const selectedStreamId = streamId || streams[0]?.id || ''

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 10) {
      setErrors({ password: 'Password must be at least 10 characters.' })
      return
    }
    if (role === 'company' && !selectedStreamId && streamsQuery.isLoading) {
      setErrors({ general: 'Business streams are still loading — try again in a moment.' })
      return
    }
    setErrors({})
    setPending(true)
    const home = role === 'company' ? '/company/dashboard' : '/seeker/dashboard'
    try {
      await register(
        role === 'company'
          ? {
              type: 'company',
              email,
              password,
              companyName,
              // Streams failed to load / list empty: register anyway; the
              // backend keeps its default and the stream is editable later.
              businessStreamId: selectedStreamId || undefined,
            }
          : { type: 'job_seeker', email, password, firstName, lastName },
      )
      toast('Account created — welcome to Workframe!')
      navigate(home, { replace: true })
    } catch (err) {
      if (err instanceof ProfileSaveError) {
        // The account and session are live; only the name save failed.
        toast('Account created — we couldn’t save your name, update it in your profile.')
        navigate(home, { replace: true })
        return
      }
      setErrors(registerErrors(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Join Workframe as a job seeker or a hiring company.
      </p>

      {/* role toggle */}
      <div
        role="tablist"
        aria-label="Account type"
        className="mt-5 grid grid-cols-2 gap-1 rounded border-2 border-border bg-muted p-1"
      >
        <RoleTab active={role === 'job_seeker'} onClick={() => setRole('job_seeker')}>
          Job Seeker
        </RoleTab>
        <RoleTab active={role === 'company'} onClick={() => setRole('company')}>
          Company
        </RoleTab>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {role === 'job_seeker' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first" required>
                First name
              </Label>
              <Input
                id="first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last" required>
                Last name
              </Label>
              <Input
                id="last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="company" required>
                Company name
              </Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="stream" required>
                Business stream
              </Label>
              <Select
                id="stream"
                value={selectedStreamId}
                onChange={(e) => setStreamId(e.target.value)}
                disabled={streamsQuery.isLoading || streamsQuery.isError}
              >
                {streamsQuery.isLoading ? (
                  <option value="">Loading…</option>
                ) : (
                  streams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.business_stream_name}
                    </option>
                  ))
                )}
              </Select>
              {streamsQuery.isError && (
                <p className="mt-1.5 text-sm font-medium text-destructive" role="alert">
                  Couldn’t load business streams — you can still sign up and pick one later, or{' '}
                  <button
                    type="button"
                    onClick={() => streamsQuery.refetch()}
                    className="font-semibold underline underline-offset-2"
                  >
                    retry now
                  </button>
                  .
                </p>
              )}
            </div>
          </>
        )}

        <div>
          <Label htmlFor="r-email" required>
            Email
          </Label>
          <Input
            id="r-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            required
          />
          {errors.email && (
            <p className="mt-1.5 text-sm font-medium text-destructive" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="r-password" required>
            Password
          </Label>
          <div className="relative">
            <Input
              id="r-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-11"
              aria-invalid={Boolean(errors.password)}
              required
            />
            <button
              type="button"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              aria-pressed={showPw}
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-sm font-medium text-destructive" role="alert">
              {errors.password}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">At least 10 characters.</p>
          )}
        </div>

        {errors.general && (
          <p className="text-sm font-medium text-destructive" role="alert">
            {errors.general}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
        active ? 'bg-background text-foreground shadow-hard' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
