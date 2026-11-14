import { Link } from 'react-router'

function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
      <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
        Anna Johnson <span className="text-copper">Flooring</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/login" className="rounded-md px-3 py-2 font-medium hover:text-copper">
          Log in
        </Link>
        <Link
          to="/register"
          className="rounded-md bg-espresso px-4 py-2 font-medium text-white hover:bg-espresso-dark"
        >
          Register
        </Link>
      </nav>
    </header>
  )
}

export default SiteHeader
