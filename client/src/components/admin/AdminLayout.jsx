import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/AuthContext'

const sections = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/requests', label: 'Requests' },
  { to: '/admin/quotes', label: 'Quotes' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/bills', label: 'Bills' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/clients', label: 'Clients' },
  { to: '/admin/reports', label: 'Reports' },
]

const navClass = ({ isActive }) =>
  `block shrink-0 rounded-md px-4 py-2.5 ${isActive ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink'}`

// Shell for every admin page: sidebar on the left, the current page on the right.
// Only admins get in; anyone else is sent to log in or back to the home page.
function AdminLayout() {
  const { client, loading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) return null
  if (!client) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (client.role !== 'admin') return <Navigate to="/" replace />

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col border-line bg-cream px-4 py-6 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-r">
        <Link to="/" className="px-2 font-serif text-xl leading-tight font-semibold">
          Anna Johnson
          <span className="block text-copper">Flooring</span>
        </Link>
        <p className="mt-1 px-2 text-sm text-muted">Owner dashboard</p>

        <nav className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
          {sections.map((section) => (
            <NavLink key={section.to} to={section.to} end={section.end} className={navClass}>
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 md:mt-auto">
          <button type="button" onClick={handleLogout} className="rounded-md px-4 py-2 text-left hover:text-copper">
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-[#faf6ef] px-4 py-8 sm:px-8 md:px-12 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
