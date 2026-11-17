import { useState } from 'react'
import { Link, Navigate } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import FormField from '../components/FormField'
import SiteHeader from '../components/SiteHeader'

const MIN_PASSWORD_LENGTH = 8

const emptyForm = { fullName: '', email: '', password: '', confirmPassword: '' }

function validate(form) {
  const errors = {}
  if (!form.fullName.trim()) errors.fullName = 'Full name is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

const allTouched = { fullName: true, email: true, password: true, confirmPassword: true }

function Register() {
  const { client, loading } = useAuth()
  const [form, setForm] = useState(emptyForm)
  // Fields the user has interacted with; errors only show for these so the form doesn't start out red.
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')

  // Re-validated on every render, so errors update live as the user types.
  const clientErrors = validate(form)
  const errorFor = (name) => (touched[name] ? clientErrors[name] : undefined) || serverErrors[name]
  const passwordsMatch = form.confirmPassword.length > 0 && form.confirmPassword === form.password

  if (!loading && client) return <Navigate to="/" replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: undefined }))
    // Start checking the confirmation as soon as it's as long as the password.
    if (name === 'confirmPassword' && value.length > 0 && value.length >= form.password.length) {
      setTouched((prev) => ({ ...prev, confirmPassword: true }))
    }
  }

  function handleBlur(event) {
    const { name, value } = event.target
    if (value) setTouched((prev) => ({ ...prev, [name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setTouched(allTouched)
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      const { data } = await api.post('/auth/register', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      setCreatedEmail(data.client.email)
      setForm(emptyForm)
      setTouched({})
    } catch (err) {
      const body = err.response?.data
      if (body?.fields) setServerErrors(body.fields)
      setFormError(body?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-10">
        <div className="w-full max-w-md rounded-lg border border-line bg-[#fffcf7] p-6 shadow-sm sm:p-10">
          {createdEmail ? (
            <div role="status">
              <h1 className="font-serif text-3xl font-medium tracking-tight">You&apos;re all set</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Your account for <span className="font-medium text-ink">{createdEmail}</span> has been created. Log in
                to request your first quote.
              </p>
              <Link
                to="/login"
                state={{ email: createdEmail }}
                className="mt-8 block w-full rounded-md bg-espresso px-4 py-3 text-center text-sm font-medium text-white hover:bg-espresso-dark"
              >
                Log in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl font-medium tracking-tight">Create your account</h1>
              <p className="mt-2 text-sm text-muted">One account for quotes, negotiations and invoices.</p>

              {formError && (
                <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {formError}
                </p>
              )}

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
                <FormField
                  label="Full name"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={form.fullName}
                  error={errorFor('fullName')}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
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
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  value={form.password}
                  error={errorFor('password')}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                <FormField
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={form.confirmPassword}
                  error={errorFor('confirmPassword')}
                  hint={passwordsMatch ? 'Passwords match.' : undefined}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-md bg-espresso px-4 py-3 text-sm font-medium text-white hover:bg-espresso-dark disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Creating account…' : 'Register'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-ink underline underline-offset-4 hover:text-copper">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default Register
