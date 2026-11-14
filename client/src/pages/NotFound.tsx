import { Link } from 'react-router'

function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-24">
      <h1 className="text-4xl font-bold">404</h1>
      <p>Page not found.</p>
      <Link to="/" className="text-emerald-600 underline">
        Go home
      </Link>
    </section>
  )
}

export default NotFound
