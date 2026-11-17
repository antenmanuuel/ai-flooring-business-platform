import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import FormField from '../components/FormField'
import SiteHeader from '../components/SiteHeader'

function validate(form) {
  const errors = {}
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Password is required.'
  return errors
}

function Login() {
  const { client, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Arriving from registration pre-fills the email; arriving from a protected page returns there after login.
  const redirectTo = location.state?.from || '/'

  const [form, setForm] = useState({ email: location.state?.email || '', password: '' })
  const [touched, setTouched] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const clientErrors = validate(form)
  const errorFor = (name) => (touched[name] ? clientErrors[name] : undefined)

  if (!loading && client && !submitting) return <Navigate to={redirectTo} replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (formError) setFormError('')
  }

  function handleBlur(event) {
    const { name, value } = event.target
    if (value) setTouched((prev) => ({ ...prev, [name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setTouched({ email: true, password: true })
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      await login(form.email.trim(), form.password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setFormError(err.response?.data?.error || 'Something went wrong. Please try again.')
      setForm((prev) => ({ ...prev, password: '' }))
      setTouched((prev) => ({ ...prev, password: false }))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-10">
        <div className="w-full max-w-md rounded-lg border border-line bg-[#fffcf7] p-6 shadow-sm sm:p-10">
          <h1 className="font-serif text-3xl font-medium tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Log in to see your quotes and invoices.</p>

          {formError && (
            <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {formError}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <FormField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jane@example.com"
              value={form.email}
              error={errorFor('email')}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <FormField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={form.password}
              error={errorFor('password')}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-espresso px-4 py-3 text-sm font-medium text-white hover:bg-espresso-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            No account yet?{' '}
            <Link to="/register" className="font-medium text-ink underline underline-offset-4 hover:text-copper">
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
