import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'
import type { UserType } from '@/lib/mock/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const { login, loginDemo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/seeker/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    login(email, password)
    navigate(from, { replace: true })
  }

  const demo = (role: UserType) => {
    loginDemo(role)
    navigate(role === 'company' ? '/company/dashboard' : from, { replace: true })
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to apply and track your work.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="pr-11"
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
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don’t have an account?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border/40" />
        or
        <span className="h-px flex-1 bg-border/40" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full" onClick={() => demo('job_seeker')}>
          Continue as demo Seeker
        </Button>
        <Button variant="outline" className="w-full" onClick={() => demo('company')}>
          Continue as demo Company
        </Button>
      </div>
    </div>
  )
}
