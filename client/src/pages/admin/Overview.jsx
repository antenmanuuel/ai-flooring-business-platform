import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import api from '../../api/client'
import { fullName } from './clientHelpers'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function Overview() {
  // Everything on this page comes from the database (GET /api/admin/overview).
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get('/admin/overview')
      .then(({ data }) => setOverview(data))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Could not load the dashboard. Please refresh the page.
      </p>
    )
  }

  const stats = overview?.stats
  const cards = [
    { label: 'New requests', value: stats?.newRequests },
    { label: 'Open quotes', value: stats?.openQuotes },
    { label: 'Active orders', value: stats?.activeOrders },
    { label: 'Unpaid bills', value: stats && money.format(stats.unpaidBills) },
  ]

  const attention = [
    ...(overview?.newRequests ?? []).map((request) => ({
      id: `request-${request.id}`,
      kind: 'New request',
      text: `${fullName(request)} requested a quote (R-${request.id})`,
      to: '/admin/quotes',
    })),
    ...(overview?.pendingSignups ?? []).map((client) => ({
      id: `signup-${client.id}`,
      kind: 'Sign-up',
      text: `${fullName(client)} signed up and is waiting for approval`,
      to: '/admin/clients',
    })),
  ]

  return (
    <>
      <h1 className="min-h-10 font-serif text-4xl font-medium">
        {overview && `${overview.greeting}, ${overview.firstName}`}
      </h1>
      <p className="mt-1 text-muted">Here’s what needs your attention today.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-line bg-cream p-5 sm:p-6">
            <p className="text-sm text-muted sm:text-base">{card.label}</p>
            <p className="mt-2 min-h-8 font-serif text-2xl font-medium sm:min-h-10 sm:text-4xl">{card.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-2xl font-medium">Needs your attention</h2>
      <ul className="mt-4 rounded-lg border border-line bg-cream px-4 py-2 sm:px-6">
        {attention.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-0"
          >
            <span className="text-xs font-semibold tracking-wide text-copper uppercase sm:w-40 sm:shrink-0 sm:pl-2 sm:text-sm">
              {item.kind}
            </span>
            {item.to ? (
              <Link to={item.to} className="hover:text-copper hover:underline">
                {item.text}
              </Link>
            ) : (
              <span>{item.text}</span>
            )}
          </li>
        ))}
        {overview && attention.length === 0 && (
          <li className="py-4 text-muted sm:pl-2">Nothing needs your attention right now.</li>
        )}
      </ul>
    </>
  )
}

export default Overview
