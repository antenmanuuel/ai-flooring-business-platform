import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import api from '../../api/client'
import { darkButton, formatDate, fullName, plainButton, redButton, statusBadge } from './clientHelpers'
import { requestStatus } from '../../requestHelpers'

// Filled in once the quotes, orders and bills tables exist. Requests are shown above them.
const historySections = ['Quotes', 'Orders', 'Bills']

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
  const [requests, setRequests] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/admin/clients/${id}`)
      .then(({ data }) => {
        setClient(data.client)
        setRequests(data.requests)
      })
      .catch((err) => {
        if (err.response?.status === 404) setNotFound(true)
        else setError('Could not load this client. Please refresh the page.')
      })
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
    if (!window.confirm(`${action} ${fullName(client)}? This permanently removes the account.`)) return
    setError('')
    try {
      await api.delete(`/admin/clients/${client.id}`)
      navigate('/admin/clients')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove this client. Please try again.')
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
  if (!client) {
    return (
      <>
        {backLink}
        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </>
    )
  }

  const badge = statusBadge[client.status]

  return (
    <>
      {backLink}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">{fullName(client)}</h1>
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
          {/* Requests: every quote request this client has sent, newest first. */}
          <div className="rounded-lg border border-line bg-cream p-6">
            <h3 className="font-medium">Requests {requests.length > 0 && `(${requests.length})`}</h3>
            {requests.length === 0 ? (
              <p className="mt-1 text-sm text-muted">No requests yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {requests.map((request) => {
                  const status = requestStatus[request.status]
                  return (
                    <li key={request.id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <Link to="/admin/quotes" className="hover:text-copper hover:underline">
                          R-{request.id}
                        </Link>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="text-sm text-muted">
                        {request.roomNames} · {request.totalArea.toLocaleString('en-US')} sq ft · {formatDate(request.createdAt)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
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
