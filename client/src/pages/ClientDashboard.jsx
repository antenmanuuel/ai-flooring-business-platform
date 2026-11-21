import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import SiteHeader from '../components/SiteHeader'
import { clientRequestStatus, formatDate } from '../requestHelpers'

// The numbers are 0 until the quotes, orders and bills tables exist.
// Each one becomes a COUNT/SUM query for the logged-in client then.
const stats = [
  { label: 'Quotes to review', value: '0' },
  { label: 'Upcoming installations', value: '0' },
  { label: 'Balance due', value: '$0.00' },
  { label: 'Completed projects', value: '0' },
]

// Each tab and what it shows while there's nothing to list yet.
const tabs = [
  { key: 'projects', label: 'Projects', title: 'Your projects', empty: 'No projects yet. Request a quote to start one.' },
  { key: 'orders', label: 'Orders', title: 'Your orders', empty: 'No orders yet. An order is created when you accept a quote.' },
  { key: 'bills', label: 'Bills', title: 'Your bills', empty: 'No bills yet. Your bill arrives after the installation.' },
]

// The "All projects" dropdown: which request statuses each choice shows.
// ("Completed" is added when orders exist, since a project is completed through its order.)
const projectFilters = [
  { value: 'all', label: 'All projects', statuses: null },
  { value: 'open', label: 'Open', statuses: ['pending', 'quoted', 'countered'] },
  { value: 'accepted', label: 'Accepted', statuses: ['accepted'] },
  { value: 'closed', label: 'Closed', statuses: ['rejected', 'canceled'] },
]

// The client's dashboard. "Your projects" lists their quote requests; quotes, orders and bills come later.
function ClientDashboard() {
  const { client, loading } = useAuth()
  const location = useLocation()
  const [tab, setTab] = useState('projects')
  const [projectFilter, setProjectFilter] = useState('all')

  // The client's quote requests (GET /api/client/requests).
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState(false)
  const isClient = client?.role === 'client'
  useEffect(() => {
    if (!isClient) return
    api
      .get('/client/requests')
      .then(({ data }) => setRequests(data.requests))
      .catch(() => setRequestsError(true))
      .finally(() => setRequestsLoading(false))
  }, [isClient])

  if (loading) return null
  if (!client) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (client.role === 'admin') return <Navigate to="/admin" replace />

  const current = tabs.find((t) => t.key === tab)
  const waitingForAnna = requests.filter((r) => r.status === 'pending').length
  const { statuses } = projectFilters.find((f) => f.value === projectFilter)
  const shownRequests = requests.filter((r) => !statuses || statuses.includes(r.status))

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-20 sm:px-6 md:pt-10">
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-copper uppercase">Client dashboard</p>
            <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">Welcome back, {client.firstName}</h1>
            <p className="mt-2 text-muted">Your home. Your projects.</p>
          </div>
          <Link
            to="/client/request"
            className="rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark"
          >
            + Request a quote
          </Link>
        </div>

        {/* Stats */}
        <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-6 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="mt-1 font-serif text-3xl font-medium">{stat.value}</dd>
            </div>
          ))}
        </dl>

        {/* Needs your attention */}
        <h2 className="mt-10 font-serif text-2xl font-medium">Needs your attention</h2>
        <p className="mt-4 rounded-lg border border-line bg-white/60 px-5 py-4 text-muted">
          Nothing needs your attention right now.
        </p>

        {/* Projects / Orders / Bills */}
        <div className="mt-10 flex gap-2 border-b border-line pb-3" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-4 py-2 ${tab === t.key ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section className="mt-6" role="tabpanel">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-medium">{current.title}</h2>
              {/* Requests Anna hasn't quoted yet. Only shown when there are some. */}
              {tab === 'projects' && waitingForAnna > 0 && (
                <p className="mt-1 text-sm text-muted">
                  {waitingForAnna} waiting for Anna&apos;s quote
                </p>
              )}
            </div>
            {tab === 'projects' && (
              <select
                aria-label="Filter projects"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-copper focus:ring-2 focus:ring-copper/25 focus:outline-none"
              >
                {projectFilters.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          {tab === 'projects' && requestsLoading ? (
            <p className="mt-6 text-muted">Loading your projects...</p>
          ) : tab === 'projects' && requestsError ? (
            <p role="alert" className="mt-6 text-red-700">
              Could not load your projects. Please refresh the page.
            </p>
          ) : tab === 'projects' && requests.length > 0 && shownRequests.length === 0 ? (
            <p className="mt-6 text-muted">No projects match this filter.</p>
          ) : tab === 'projects' && requests.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {shownRequests.map((request) => {
                const status = clientRequestStatus[request.status]
                return (
                  <li key={request.id} className="flex flex-wrap items-center justify-between gap-4 py-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link to={`/client/requests/${request.id}`} className="font-medium hover:text-copper hover:underline">
                          {request.roomNames}
                        </Link>
                        <span className={`rounded px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        R-{request.id} · {request.totalArea.toLocaleString('en-US')} sq ft ·{' '}
                        {request.roomCount} {request.roomCount === 1 ? 'room' : 'rooms'} · {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <Link
                      to={`/client/requests/${request.id}`}
                      className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink/30"
                    >
                      View project →
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-6 text-muted">{current.empty}</p>
          )}
        </section>
      </main>
    </div>
  )
}

export default ClientDashboard
