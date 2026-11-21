import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import api from '../../api/client'
import RequestRoomsTable from '../../components/RequestRoomsTable'
import { formatDate, formatDay, money, requestStatus } from '../../requestHelpers'
import { fullName } from './clientHelpers'

const CLOSED = ['accepted', 'rejected', 'canceled']

// Every quote request, with its rooms and photos. Sending quotes and the negotiation come next.
function Quotes() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showClosed, setShowClosed] = useState(false)

  useEffect(() => {
    api
      .get('/admin/requests')
      .then(({ data }) => setRequests(data.requests))
      .catch(() => setError('Could not load quote requests. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  const shown = requests.filter((r) => showClosed || !CLOSED.includes(r.status))

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium">Quotes &amp; negotiation</h1>
          <p className="mt-1 text-muted">Every quote version and client reply is kept.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show accepted &amp; closed
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {loading && <p className="mt-8 text-muted">Loading quote requests...</p>}
      {!loading && !error && shown.length === 0 && (
        <p className="mt-8 rounded-lg border border-line bg-cream px-6 py-10 text-center text-muted">
          No quote requests yet. They show up here when clients send them.
        </p>
      )}

      <div className="mt-6 space-y-6">
        {shown.map((request) => {
          const badge = requestStatus[request.status]
          return (
            <article key={request.id} className="rounded-lg border border-line bg-cream p-5 sm:p-6">
              {/* Header: request number, client, status, budget */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-serif text-xl font-medium">
                    R-{request.id} ·{' '}
                    <Link to={`/admin/clients/${request.client.id}`} className="hover:text-copper hover:underline">
                      {fullName(request.client)}
                    </Link>
                  </h2>
                  <span className={`rounded px-2 py-0.5 text-xs ${badge.className}`}>{badge.label}</span>
                </div>
                <p className="text-sm text-muted">
                  {request.budget !== null ? `Budget ${money.format(request.budget)}` : 'No budget given'}
                </p>
              </div>

              {/* Timeline: the request is the first entry. Quotes and replies are added below it later. */}
              <div className="mt-5 border-l border-line pl-5">
                <div className="relative">
                  <span className="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full bg-copper" />
                  <p className="text-sm">
                    <span className="font-medium">Request</span>
                    <span className="text-muted"> · Client · {formatDate(request.createdAt)}</span>
                  </p>

                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Service address</dt>
                      <dd>{request.serviceAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Preferred installation</dt>
                      <dd>{request.preferredDate ? formatDay(request.preferredDate) : 'Flexible'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Contact</dt>
                      <dd>
                        {request.client.email} · {request.client.phone}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4">
                    <RequestRoomsTable rooms={request.rooms} totalArea={request.totalArea} />
                  </div>

                  {request.notes && (
                    <p className="mt-4 text-sm">
                      <span className="text-muted">Notes: </span>“{request.notes}”
                    </p>
                  )}

                  {request.photos.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {request.photos.map((url, i) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" title="Open full size">
                          <img
                            src={url}
                            alt={`Photo ${i + 1} for request R-${request.id}`}
                            className="h-20 w-20 rounded-md border border-line object-cover hover:opacity-90"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}

export default Quotes
