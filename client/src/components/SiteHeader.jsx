import { Link, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'

// whitespace-nowrap keeps "Log in" on one line on narrow phones.
const plainLink = 'rounded-md px-3 py-2 font-medium whitespace-nowrap hover:text-copper'
const buttonLink = 'rounded-md bg-espresso px-4 py-2 font-medium whitespace-nowrap text-white hover:bg-espresso-dark'

function SiteHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { client, loading, logout } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  let nav = null
  if (client) {
    nav = (
      <>
        <span className="hidden px-3 text-muted sm:inline">
          Hi, <span className="font-medium text-ink">{client.firstName}</span>
        </span>
        {/* Anna's dashboard is /admin; a client's is /client. */}
        <Link to={client.role === 'admin' ? '/admin' : '/client'} className={plainLink}>
          Dashboard
        </Link>
        <button type="button" onClick={handleLogout} className={plainLink}>
          Log out
        </button>
      </>
    )
  } else if (!loading) {
    nav = (
      <>
        {pathname !== '/login' && (
          <Link to="/login" className={plainLink}>
            Log in
          </Link>
        )}
        {pathname !== '/register' && (
          // On the login page the mockup shows Register as a plain link rather than a button.
          <Link to="/register" className={pathname === '/login' ? plainLink : buttonLink}>
            Register
          </Link>
        )}
      </>
    )
  }

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
      <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
        Anna <span className="text-copper">Flooring</span>
      </Link>
      <nav className="flex min-h-9 items-center gap-2 text-sm">{nav}</nav>
    </header>
  )
}

export default SiteHeader
