import { useEffect, useState } from 'react'
import api from '../../api/client'

// Placeholder numbers until the requests, quotes, orders and bills tables exist.
const stats = [
  { label: 'New requests', value: '1' },
  { label: 'Open quotes', value: '2' },
  { label: 'Active orders', value: '1' },
  { label: 'Unpaid bills', value: '$8,141.92' },
]

const attention = [
  { kind: 'Sign-up', text: 'Sofia Rossi signed up and is waiting for approval' },
  { kind: 'Request', text: 'Emma Walsh requested a quote (2 rooms)' },
  { kind: 'Dispute', text: 'David Kim disputed bill B-1010' },
  { kind: 'Overdue', text: 'Laura Chen’s bill B-1009 is 20 days old ($1,771.92)' },
  { kind: 'Overdue', text: 'David Kim’s bill B-1010 is 10 days old ($6,370.00)' },
]

function Overview() {
  // Greeting and name come from the database (GET /api/admin/overview).
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    api.get('/admin/overview').then(({ data }) => setOverview(data))
  }, [])

  return (
    <>
      <h1 className="min-h-10 font-serif text-4xl font-medium">
        {overview && `${overview.greeting}, ${overview.firstName}`}
      </h1>
      <p className="mt-1 text-muted">Here’s what needs your attention today.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-line bg-cream p-5 sm:p-6">
            <p className="text-sm text-muted sm:text-base">{stat.label}</p>
            <p className="mt-2 font-serif text-2xl font-medium sm:text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-serif text-2xl font-medium">Needs your attention</h2>
      <ul className="mt-4 rounded-lg border border-line bg-cream px-4 py-2 sm:px-6">
        {attention.map((item) => (
          <li
            key={item.text}
            className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-0"
          >
            <span className="text-xs font-semibold tracking-wide text-copper uppercase sm:w-40 sm:shrink-0 sm:pl-2 sm:text-sm">
              {item.kind}
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default Overview
