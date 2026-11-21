import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import RequestRoomsTable from '../components/RequestRoomsTable'
import SiteHeader from '../components/SiteHeader'
import { clientRequestStatus, formatDate, formatDay, money } from '../requestHelpers'

// What happens next, shown under the request while it's waiting.
const nextStep = {
  pending: 'Anna is reviewing your request. She will send you an itemized quote, and it will show up here.',
}

// Only logged-in clients can open a project. Anna is sent to her dashboard.
function ClientProject() {
  const { client, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!client) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (client.role === 'admin') return <Navigate to="/admin" replace />

  return <ProjectDetails />
}

// One of the client's quote requests (GET /api/client/requests/:id).
function ProjectDetails() {
  const { id } = useParams()
  const [request, setRequest] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get(`/client/requests/${id}`)
      .then(({ data }) => setRequest(data.request))
      .catch((err) =>
        setError(err.response?.status === 404 ? 'Project not found.' : 'Could not load this project. Please refresh the page.'),
      )
  }, [id])

  const status = request && clientRequestStatus[request.status]

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-4 pb-20 sm:px-6">
        <Link to="/client" className="text-sm text-muted hover:text-copper">
          ← My dashboard
        </Link>

        {error && (
          <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        {request && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-4xl font-medium tracking-tight">
                {request.rooms.map((room) => room.name).join(', ')}
              </h1>
              <span className={`rounded px-2 py-0.5 text-sm ${status.className}`}>{status.label}</span>
            </div>
            <p className="mt-2 text-muted">
              R-{request.id} · {request.totalArea.toLocaleString('en-US')} sq ft · Sent {formatDate(request.createdAt)}
            </p>

            {nextStep[request.status] && (
              <p className="mt-6 rounded-lg border border-line bg-white/60 px-5 py-4">{nextStep[request.status]}</p>
            )}

            <h2 className="mt-10 font-serif text-2xl font-medium">Project details</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted">Service address</dt>
                <dd className="mt-1">{request.serviceAddress}</dd>
              </div>
              <div>
                <dt className="text-muted">Preferred installation</dt>
                <dd className="mt-1">{request.preferredDate ? formatDay(request.preferredDate) : 'Flexible'}</dd>
              </div>
              <div>
                <dt className="text-muted">Budget</dt>
                <dd className="mt-1">{request.budget !== null ? money.format(request.budget) : 'Not given'}</dd>
              </div>
            </dl>

            <h2 className="mt-10 font-serif text-2xl font-medium">Rooms &amp; flooring</h2>
            <div className="mt-4">
              <RequestRoomsTable rooms={request.rooms} totalArea={request.totalArea} />
            </div>

            {request.notes && (
              <>
                <h2 className="mt-10 font-serif text-2xl font-medium">Notes for Anna</h2>
                <p className="mt-3">“{request.notes}”</p>
              </>
            )}

            {request.photos.length > 0 && (
              <>
                <h2 className="mt-10 font-serif text-2xl font-medium">Photos</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {request.photos.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" title="Open full size">
                      <img
                        src={url}
                        alt={`Photo ${i + 1} of this project`}
                        className="h-28 w-28 rounded-md border border-line object-cover hover:opacity-90"
                      />
                    </a>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default ClientProject
