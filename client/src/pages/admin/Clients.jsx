import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import api from '../../api/client'
import { darkButton, formatDate, plainButton, redButton, statusBadge } from './clientHelpers'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

function Clients() {
  const [clients, setClients] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/clients').then(({ data }) => setClients(data.clients))
  }, [])

  // Approve, Disable and Re-enable all just change the status.
  async function setStatus(client, status) {
    setError('')
    try {
      await api.patch(`/admin/clients/${client.id}/status`, { status })
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, status } : c)))
    } catch {
      setError('Could not update that client. Please try again.')
    }
  }

  // Delete, and Decline for a pending sign-up, remove the account.
  async function removeClient(client, action) {
    if (!window.confirm(`${action} ${client.fullName}? This permanently removes the account.`)) return
    setError('')
    try {
      await api.delete(`/admin/clients/${client.id}`)
      setClients((prev) => prev.filter((c) => c.id !== client.id))
    } catch {
      setError('Could not remove that client. Please try again.')
    }
  }

  const countFor = (status) => clients.filter((c) => c.status === status).length
  // Search matches the client number (e.g. C12), name, email, phone or address.
  const query = search.trim().toLowerCase()
  const matchesSearch = (c) =>
    `c${c.id} ${c.fullName} ${c.email} ${c.phone} ${c.address} ${c.city} ${c.state}`.toLowerCase().includes(query)

  const shown = clients.filter((c) => (filter === 'all' || c.status === filter) && matchesSearch(c))

  return (
    <>
      <h1 className="font-serif text-4xl font-medium">Clients</h1>
      <p className="mt-1 text-muted">Approve new sign-ups, disable or remove accounts.</p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone, address or C12"
          aria-label="Search clients"
          className="mb-2 w-full rounded-md border border-line bg-cream px-3.5 py-2 text-sm placeholder:text-muted/80 focus:border-copper focus:ring-2 focus:ring-copper/25 focus:outline-none sm:mr-2 sm:mb-0 sm:w-80"
        />
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
            {f.value !== 'all' && ` (${countFor(f.value)})`}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-cream">
        <table className="w-full min-w-[56rem] text-left">
          <thead className="border-b border-line bg-sand/60 text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              {/* Requests, orders and bills are 0 until those tables exist. */}
              <th className="px-4 py-3 font-medium">Requests</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Bills</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((client) => (
              <tr key={client.id} className="border-b border-line align-top last:border-b-0">
                <td className="px-4 py-4">
                  <Link
                    to={`/admin/clients/${client.id}`}
                    className="whitespace-nowrap underline-offset-4 hover:text-copper hover:underline"
                  >
                    {client.fullName}
                  </Link>
                  <p className="text-sm text-muted">C{client.id}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{client.email}</p>
                  <p className="text-sm text-muted">
                    {client.phone} · {client.address}, {client.city}, {client.state}
                  </p>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">{formatDate(client.createdAt)}</td>
                <td className="px-4 py-4">0</td>
                <td className="px-4 py-4">0</td>
                <td className="px-4 py-4">0</td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm whitespace-nowrap ${statusBadge[client.status].className}`}
                  >
                    {statusBadge[client.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {client.status === 'pending' && (
                      <>
                        <button type="button" className={darkButton} onClick={() => setStatus(client, 'active')}>
                          Approve
                        </button>
                        <button type="button" className={redButton} onClick={() => removeClient(client, 'Decline')}>
                          Decline
                        </button>
                      </>
                    )}
                    {client.status === 'active' && (
                      <button type="button" className={plainButton} onClick={() => setStatus(client, 'disabled')}>
                        Disable
                      </button>
                    )}
                    {client.status === 'disabled' && (
                      <button type="button" className={plainButton} onClick={() => setStatus(client, 'active')}>
                        Re-enable
                      </button>
                    )}
                    {client.status !== 'pending' && (
                      <button type="button" className={redButton} onClick={() => removeClient(client, 'Delete')}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">
                  {query ? 'No clients match your search.' : 'No clients here yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Clients
