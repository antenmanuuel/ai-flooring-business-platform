import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import api from '../../api/client'
import { formatDate, formatDay, money, requestStatus } from '../../requestHelpers'
import { fullName } from './clientHelpers'

// The status filter buttons. "New" is a request still waiting for Anna's first quote.
const filters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'New' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'countered', label: 'Countered' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'canceled', label: 'Canceled' },
]

// Every quote request clients have sent, newest first (GET /api/admin/requests).
function Requests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api
      .get('/admin/requests')
      .then(({ data }) => setRequests(data.requests))
      .catch(() => setError('Could not load requests. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  const shown = requests.filter((r) => filter === 'all' || r.status === filter)

  return (
    <>
      <h1 className="font-serif text-4xl font-medium">Project requests</h1>
      <p className="mt-1 text-muted">Every request clients have submitted.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === f.value ? 'bg-espresso text-white' : 'bg-sand text-ink hover:bg-line'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-cream">
        <table className="w-full text-left">
          <thead className="border-b border-line bg-sand/60 text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Request</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Rooms</th>
              <th className="px-4 py-3 font-medium">Total area</th>
              <th className="px-4 py-3 font-medium">Budget</th>
              <th className="px-4 py-3 font-medium">Preferred date</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((request) => {
              const status = requestStatus[request.status]
              return (
                <tr key={request.id} className="border-b border-line align-top last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to="/admin/quotes" className="underline-offset-4 hover:text-copper hover:underline">
                      R-{request.id}
                    </Link>
                    <p className="text-sm whitespace-nowrap text-muted">{formatDate(request.createdAt)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/admin/clients/${request.client.id}`}
                      className="underline-offset-4 hover:text-copper hover:underline"
                    >
                      {fullName(request.client)}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{request.rooms.map((room) => room.name).join(', ')}</td>
                  <td className="px-4 py-4 whitespace-nowrap">{request.totalArea.toLocaleString('en-US')} sq ft</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {request.budget !== null ? money.format(request.budget) : '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {request.preferredDate ? formatDay(request.preferredDate) : 'Flexible'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-sm whitespace-nowrap ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {loading
                    ? 'Loading requests...'
                    : filter === 'all'
                      ? 'No requests yet. They show up here when clients send them.'
                      : 'No requests with this status.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Requests
