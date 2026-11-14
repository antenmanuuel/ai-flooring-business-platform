import { Link } from 'react-router'
import HeroIllustration from '../components/HeroIllustration'
import MaterialSwatch from '../components/MaterialSwatch'
import SiteFooter from '../components/SiteFooter'
import SiteHeader from '../components/SiteHeader'
import { materials } from '../data/materials'

const steps = [
  { title: 'Register', body: 'Create your client account in a minute.' },
  { title: 'Describe your rooms', body: "Add each room's size, the floor you want, and up to 5 photos." },
  { title: 'Get & negotiate a quote', body: 'Anna sends an itemized quote. Accept it or counter.' },
  { title: 'Install & pay', body: 'Your floor is installed, then you pay the final bill online.' },
]

const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function Home() {
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
              Anna Johnson supplies and installs hardwood, vinyl, tile, laminate and carpet. Tell us about your rooms
              and get a clear, itemized quote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark"
              >
                Register to request a quote
              </Link>
              <a
                href="#materials"
                className="rounded-md border border-line bg-white px-5 py-3 text-sm font-medium hover:border-ink/30"
              >
                See materials
              </a>
            </div>
          </div>
          <div className="aspect-4/3 overflow-hidden rounded-lg shadow-xl shadow-espresso/15">
            <HeroIllustration />
          </div>
        </section>

        {/* Materials */}
        <section id="materials" className="scroll-mt-4 bg-sand py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-serif text-3xl font-medium tracking-tight">Materials we install</h2>
            <p className="mt-2 text-sm text-muted">
              Typical starting prices. Your quote includes exact products and quantities.
            </p>
            <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {materials.map((material) => (
                <li key={material.id} className="overflow-hidden rounded-md border border-line bg-white">
                  <div className="aspect-square">
                    <MaterialSwatch texture={material.texture} seed={material.id} label={material.name} />
                  </div>
                  <div className="p-4 sm:p-5">
                    <h3 className="font-serif text-lg font-medium">{material.name}</h3>
                    <p className="mt-2 text-xs text-muted">
                      from{' '}
                      <span className="text-xl font-semibold text-ink">{price.format(material.pricePerSqFt)}</span> / sq
                      ft
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
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
      </main>

      <SiteFooter />
    </div>
  )
}

export default Home
