import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import heroImage from '../assets/hero-living-room.jpg'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'

const steps = [
  { title: 'Register', body: 'Create your client account in a minute.' },
  { title: 'Describe your rooms', body: "Add each room's size, the floor you want, and up to 5 photos." },
  { title: 'Get & negotiate a quote', body: 'Anna sends an itemized quote. Accept it or counter.' },
  { title: 'Install & pay', body: 'Your floor is installed, then you pay the final bill online.' },
]

const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const mainButton = 'rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark'

function Home() {
  const { client, loading: authLoading } = useAuth()
  // Products Anna added on the admin Products page, loaded from the database.
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .get('/products')
      .then(({ data }) => setProducts(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 md:grid-cols-2 md:pt-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">Sales &amp; installation</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.1] font-medium tracking-tight text-balance lg:text-6xl">
              Floors installed right, start to finish.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
              Anna Flooring supplies and installs hardwood, vinyl, tile, laminate and carpet. Tell us about your rooms
              and get a clear, itemized quote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {/* Visitors are asked to register; logged-in users get a link to their dashboard
                  (/admin for Anna, /client for clients). */}
              {!authLoading && !client && (
                <Link to="/register" className={mainButton}>
                  Register to request a quote
                </Link>
              )}
              {client && (
                <Link to={client.role === 'admin' ? '/admin' : '/client'} className={mainButton}>
                  Go to dashboard
                </Link>
              )}
              <a
                href="#materials"
                className="rounded-md border border-line bg-white px-5 py-3 text-sm font-medium hover:border-ink/30"
              >
                See materials
              </a>
            </div>
          </div>
          <div className="aspect-4/3 overflow-hidden rounded-lg shadow-xl shadow-espresso/15">
            <img
              src={heroImage}
              alt="Sunlit living room with wide oak plank flooring"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        {/* Materials */}
        <section id="materials" className="scroll-mt-4 bg-sand py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-medium tracking-tight">Materials we install</h2>
            <p className="mt-2 text-sm text-muted">
              Material prices before installation. Your quote includes exact products and quantities.
            </p>

            {loading ? (
              <p className="mt-10 text-sm text-muted">Loading materials...</p>
            ) : error ? (
              <p className="mt-10 text-sm text-muted">We couldn't load our materials right now. Please try again later.</p>
            ) : products.length === 0 ? (
              <p className="mt-10 text-sm text-muted">Our catalog is being updated. Check back soon.</p>
            ) : (
              <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => (
                  <li key={product.productId} className="overflow-hidden rounded-md border border-line bg-white">
                    <div className="aspect-square bg-cream">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted">Photo coming soon</div>
                      )}
                    </div>
                    <div className="p-4 sm:p-5">
                      <p className="text-[11px] font-semibold tracking-wider text-copper uppercase">{product.category}</p>
                      <h3 className="mt-1 font-serif text-lg font-medium">{product.name}</h3>
                      <p className="mt-2 text-xs text-muted">
                        <span className="text-xl font-semibold text-ink">{price.format(product.unitPrice)}</span> /{' '}
                        {product.pricingUnit}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* How it works: steps for clients, so Anna doesn't see it. */}
        {client?.role !== 'admin' && (
          <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-3xl font-medium tracking-tight">How it works</h2>
            <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title} className="border-t border-copper/60 pt-5">
                  <span className="font-serif text-3xl text-copper">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}

export default Home
