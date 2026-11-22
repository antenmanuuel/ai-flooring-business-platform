import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import FormField from '../components/FormField'
import SiteHeader from '../components/SiteHeader'

const MIN_PASSWORD_LENGTH = 8
const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' }

// Same rules as the server (ClientAccountController and PasswordRules).
function validate(form) {
  const errors = {}
  if (!form.currentPassword) errors.currentPassword = 'Current password is required.'
  if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (form.newPassword === form.currentPassword) {
    errors.newPassword = 'New password must be different from your current password.'
  }
  if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

// Only logged-in clients can open their account page. Anna is sent to her dashboard.
function ClientAccount() {
  const { client, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!client) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (client.role === 'admin') return <Navigate to="/admin" replace />

  return <AccountDetails client={client} />
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">{children || '—'}</dd>
    </div>
  )
}

function AccountDetails({ client }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const clientErrors = validate(form)
  const errorFor = (name) => (touched[name] ? clientErrors[name] : undefined) || serverErrors[name]
  const passwordsMatch = form.confirmPassword.length > 0 && form.confirmPassword === form.newPassword

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (serverErrors[name]) setServerErrors((prev) => ({ ...prev, [name]: undefined }))
    setFormError('')
    setSaved(false)
  }

  function handleBlur(event) {
    const { name, value } = event.target
    if (value) setTouched((prev) => ({ ...prev, [name]: true }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true })
    if (Object.keys(clientErrors).length > 0) return

    setSubmitting(true)
    try {
      await api.post('/client/account/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm(EMPTY_FORM)
      setTouched({})
      setServerErrors({})
      setSaved(true)
    } catch (err) {
      const body = err.response?.data
      setServerErrors(body?.fields ?? {})
      setFormError(body?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const cityLine = [client.city, `${client.state ?? ''} ${client.zipCode ?? ''}`.trim()].filter(Boolean).join(', ')

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-20 sm:px-6">
        <Link to="/client" className="text-sm text-muted hover:text-copper">
          ← My dashboard
        </Link>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Your account</h1>

        <h2 className="mt-8 font-serif text-2xl font-medium">Details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Name">{`${client.firstName} ${client.lastName}`}</Detail>
          <Detail label="Email">{client.email}</Detail>
          <Detail label="Address">
            {client.address}
            {cityLine && <span className="block">{cityLine}</span>}
          </Detail>
        </dl>

        <h2 className="mt-10 font-serif text-2xl font-medium">Change password</h2>
        <p className="mt-1 text-sm text-muted">Changing your password logs you out on every other device.</p>

        {saved && (
          <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Your password has been changed.
          </p>
        )}
        {formError && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-4 max-w-md space-y-5">
          <FormField
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            error={errorFor('currentPassword')}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            value={form.newPassword}
            error={errorFor('newPassword')}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <FormField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            value={form.confirmPassword}
            error={errorFor('confirmPassword')}
            hint={passwordsMatch ? 'Passwords match.' : undefined}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </main>
    </div>
  )
}

export default ClientAccount
