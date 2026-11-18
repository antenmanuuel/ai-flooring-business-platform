import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import api from '../../api/client'
import { darkButton, formatDate, plainButton, redButton, statusBadge } from './clientHelpers'

// Filled in once the requests, quotes, orders and bills tables exist.
const historySections = ['Requests', 'Quotes', 'Orders', 'Bills']

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/admin/clients/${id}`)
      .then(({ data }) => setClient(data.client))
      .catch(() => setNotFound(true))
  }, [id])

  async function setStatus(status) {
    setError('')
    try {
      await api.patch(`/admin/clients/${client.id}/status`, { status })
      setClient((prev) => ({ ...prev, status }))
    } catch {
      setError('Could not update this client. Please try again.')
    }
  }

  async function removeClient(action) {
    if (!window.confirm(`${action} ${client.fullName}? This permanently removes the account.`)) return
    setError('')
    try {
      await api.delete(`/admin/clients/${client.id}`)
      navigate('/admin/clients')
    } catch {
      setError('Could not remove this client. Please try again.')
    }
  }

  const backLink = (
    <Link to="/admin/clients" className="text-sm text-muted hover:text-copper">
      ← All clients
    </Link>
  )

  if (notFound) {
    return (
      <>
        {backLink}
        <h1 className="mt-4 font-serif text-4xl font-medium">Client not found</h1>
        <p className="mt-1 text-muted">This account may have been deleted.</p>
      </>
    )
  }
  if (!client) return backLink

  const badge = statusBadge[client.status]

  return (
    <>
      {backLink}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">{client.fullName}</h1>
          <p className="mt-2 flex items-center gap-3 text-muted">
            C{client.id}
            <span className={`rounded-full px-3 py-1 text-sm ${badge.className}`}>{badge.label}</span>
          </p>
        </div>

        <div className="flex gap-2">
          {client.status === 'pending' && (
            <>
              <button type="button" className={darkButton} onClick={() => setStatus('active')}>
                Approve
              </button>
              <button type="button" className={redButton} onClick={() => removeClient('Decline')}>
                Decline
              </button>
            </>
          )}
          {client.status === 'active' && (
            <button type="button" className={plainButton} onClick={() => setStatus('disabled')}>
              Disable
            </button>
          )}
          {client.status === 'disabled' && (
            <button type="button" className={plainButton} onClick={() => setStatus('active')}>
              Re-enable
            </button>
          )}
          {client.status !== 'pending' && (
            <button type="button" className={redButton} onClick={() => removeClient('Delete')}>
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <section className="mt-8 rounded-lg border border-line bg-cream p-6">
        <h2 className="font-serif text-2xl font-medium">Contact</h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          <Detail label="Email">{client.email}</Detail>
          <Detail label="Phone">{client.phone}</Detail>
          <Detail label="Address">
            {client.address}
            <br />
            {client.city}, {client.state} {client.zipCode}
            <br />
            {client.country}
          </Detail>
          <Detail label="Registered">{formatDate(client.createdAt)}</Detail>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-medium">History</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {historySections.map((title) => (
            <div key={title} className="rounded-lg border border-line bg-cream p-6">
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted">No {title.toLowerCase()} yet.</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default ClientDetail
