import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import SiteHeader from '../components/SiteHeader'

// The quote request form. The rooms use products from Anna's catalog, and the
// request is saved with POST /api/client/requests (photos included).

const PATTERNS = ['Straight', 'Diagonal', 'Herringbone', 'Chevron']
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Photos of the project: up to 5 per request, same file rules as product photos.
const MAX_PHOTOS = 5
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

const emptyRoom = (id) => ({
  id,
  name: '',
  productId: '',
  length: '',
  width: '',
  area: '',
  currentFlooring: '',
  pattern: 'Straight',
  removeExisting: false,
})

// Square feet of a room: the total area if it was typed in, otherwise length × width.
function roomArea(room) {
  const value = room.area !== '' ? Number(room.area) : Number(room.length) * Number(room.width)
  return Number.isFinite(value) && value > 0 ? value : 0
}

// Material cost for one room, or null when it can't be worked out from square feet
// (products sold per piece or per roll, or a box product with no coverage set).
function roomEstimate(room, product) {
  if (!product) return 0
  const area = roomArea(room)
  const price = Number(product.unitPrice)
  if (product.pricingUnit === 'sq ft') return area * price
  if (product.pricingUnit === 'box' && Number(product.coveragePerBox) > 0) {
    return Math.ceil(area / Number(product.coveragePerBox)) * price
  }
  return null
}

// Today's date as yyyy-mm-dd, so the date picker can't go into the past.
function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// The main checks, done before sending. The server checks everything again.
function validate(details, rooms) {
  const errors = {}
  if (!details.address.trim()) errors.address = 'Service address is required.'
  rooms.forEach((room, i) => {
    if (!room.name.trim()) errors[`rooms.${i}.name`] = 'Room name is required.'
    if (!room.productId) errors[`rooms.${i}.productId`] = 'Choose a flooring product.'
    if (roomArea(room) === 0) errors[`rooms.${i}.area`] = 'Enter the length and width, or the total area.'
  })
  return errors
}

const inputClass =
  'mt-1.5 block w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm placeholder:text-muted/80 focus:border-copper focus:ring-2 focus:ring-copper/25 focus:outline-none'

// A label around its input, with a red error message underneath.
function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {children}
      </label>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}

// Only logged-in clients can open the form. Anna is sent to her dashboard.
function RequestQuote() {
  const { client, loading } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!client) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (client.role === 'admin') return <Navigate to="/admin" replace />

  return <RequestForm client={client} />
}

function RequestForm({ client }) {
  // The service address starts as the address on the client's account.
  const [details, setDetails] = useState({
    address: [client.address, client.city, `${client.state ?? ''} ${client.zipCode ?? ''}`.trim()].filter(Boolean).join(', '),
    preferredDate: '',
    budget: '',
    notes: '',
  })
  const [rooms, setRooms] = useState([emptyRoom(1)])
  const nextRoomId = useRef(2)

  // Sending: field errors (from the checks above or from the server), a message at the bottom,
  // and the new request's number once it's saved.
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sentId, setSentId] = useState(null)

  // Products from Anna's catalog (the admin Products page), grouped by category in the dropdown.
  const [products, setProducts] = useState([])
  const [productsError, setProductsError] = useState(false)
  useEffect(() => {
    api
      .get('/products')
      .then(({ data }) => setProducts(data))
      .catch(() => setProductsError(true))
  }, [])
  const categories = [...new Set(products.map((p) => p.category))]
  const findProduct = (id) => products.find((p) => String(p.productId) === String(id))

  // Chosen photos: { id, file, url } where url is a local preview.
  const [photos, setPhotos] = useState([])
  const [photoError, setPhotoError] = useState('')
  const nextPhotoId = useRef(1)

  // Free the previews' memory when leaving the page.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])

  function handlePhotos(e) {
    const files = [...e.target.files]
    e.target.value = '' // lets the client pick the same file again after removing it
    const added = []
    const problems = []
    for (const file of files) {
      if (!PHOTO_TYPES.includes(file.type)) {
        problems.push(`${file.name} must be a JPG, PNG or WebP file.`)
      } else if (file.size > MAX_PHOTO_BYTES) {
        problems.push(`${file.name} must be 5 MB or smaller.`)
      } else if (photos.length + added.length >= MAX_PHOTOS) {
        problems.push(`You can add up to ${MAX_PHOTOS} photos.`)
        break
      } else {
        added.push({ id: nextPhotoId.current, file, url: URL.createObjectURL(file) })
        nextPhotoId.current += 1
      }
    }
    setPhotos([...photos, ...added])
    setPhotoError(problems.join(' '))
  }

  function removePhoto(id) {
    const photo = photos.find((p) => p.id === id)
    URL.revokeObjectURL(photo.url)
    setPhotos(photos.filter((p) => p.id !== id))
    setPhotoError('')
  }

  // Typing in a field clears its error.
  const clearError = (key) => {
    if (errors[key]) setErrors({ ...errors, [key]: undefined })
    setFormError('')
  }

  const setDetail = (name) => (e) => {
    setDetails({ ...details, [name]: e.target.value })
    clearError(name)
  }

  function updateRoom(id, index, name, value) {
    setRooms(rooms.map((room) => (room.id === id ? { ...room, [name]: value } : room)))
    // Length, width and total area all clear the room's area error.
    clearError(`rooms.${index}.${['length', 'width'].includes(name) ? 'area' : name}`)
  }

  function addRoom() {
    setRooms([...rooms, emptyRoom(nextRoomId.current)])
    nextRoomId.current += 1
  }

  function removeRoom(id) {
    setRooms(rooms.filter((room) => room.id !== id))
    // Room numbers shift, so clear the room errors; they come back on the next send if still wrong.
    setErrors(Object.fromEntries(Object.entries(errors).filter(([key]) => !key.startsWith('rooms.'))))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const problems = validate(details, rooms)
    if (Object.keys(problems).length > 0) {
      setErrors(problems)
      setFormError('Please fix the highlighted fields.')
      return
    }

    // Sent as multipart/form-data: the form as JSON in "data", plus the photo files.
    const formData = new FormData()
    formData.append(
      'data',
      JSON.stringify({
        ...details,
        rooms: rooms.map((room) => ({ ...room, id: undefined })),
      }),
    )
    for (const photo of photos) formData.append('photos', photo.file)

    setSubmitting(true)
    try {
      const { data } = await api.post('/client/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSentId(data.id)
      window.scrollTo(0, 0)
    } catch (err) {
      const body = err.response?.data
      if (body?.fields) setErrors(body.fields)
      if (body?.fields?.photos) setPhotoError(body.fields.photos)
      setFormError(body?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Totals for the bottom of the form.
  const totalArea = rooms.reduce((sum, room) => sum + roomArea(room), 0)
  const estimates = rooms.map((room) => roomEstimate(room, findProduct(room.productId)))
  const totalEstimate = estimates.reduce((sum, value) => sum + (value ?? 0), 0)
  const someNotEstimated = estimates.some((value) => value === null)

  // After sending: a confirmation instead of the form.
  if (sentId) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-20 sm:px-6">
          <div role="status" className="rounded-lg border border-line bg-white/60 p-8">
            <p className="text-xs font-semibold tracking-wide text-copper uppercase">R-{sentId}</p>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">Quote requested</h1>
            <p className="mt-3 leading-relaxed text-muted">
              Thanks, {client.firstName}. Your request is currently being reviewed by Anna. She'll send you an itemized
              quote, and you'll see it on your dashboard.
            </p>
            <Link
              to="/client"
              className="mt-8 inline-block rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark"
            >
              Back to my dashboard
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-20 sm:px-6">
        <Link to="/client" className="text-sm text-muted hover:text-copper">
          ← My dashboard
        </Link>
        <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight">Request a quote</h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Project details */}
          <h2 className="mt-8 font-serif text-2xl font-medium">Project details</h2>
          <div className="mt-4 space-y-4">
            <Field label="Service address" error={errors.address}>
              <input className={inputClass} value={details.address} onChange={setDetail('address')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred installation date" error={errors.preferredDate}>
                <input
                  type="date"
                  min={today()}
                  className={inputClass}
                  value={details.preferredDate}
                  onChange={setDetail('preferredDate')}
                />
              </Field>
              <Field label="Budget ($, optional)" error={errors.budget}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={details.budget}
                  onChange={setDetail('budget')}
                />
              </Field>
            </div>
          </div>

          {/* Rooms & flooring */}
          <h2 className="mt-10 font-serif text-2xl font-medium">Rooms &amp; flooring</h2>
          {productsError && (
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              Could not load the flooring products. Please refresh the page.
            </p>
          )}
          {errors.rooms && <p className="mt-2 text-sm text-red-700">{errors.rooms}</p>}

          {rooms.map((room, index) => {
            const product = findProduct(room.productId)
            const estimate = estimates[index]
            const roomError = (name) => errors[`rooms.${index}.${name}`]
            const update = (name) => (e) => updateRoom(room.id, index, name, e.target.value)
            return (
              <fieldset key={room.id} className="mt-4 rounded-lg border border-line bg-white/60 px-5 pt-2 pb-5">
                <legend className="px-2 text-sm font-medium">Room {index + 1}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Room name" error={roomError('name')}>
                    <input className={inputClass} placeholder="Kitchen" value={room.name} onChange={update('name')} />
                  </Field>
                  <Field label="Flooring product" error={roomError('productId')}>
                    <select className={inputClass} value={room.productId} onChange={update('productId')}>
                      <option value="">Select flooring</option>
                      {categories.map((category) => (
                        <optgroup key={category} label={category}>
                          {products
                            .filter((p) => p.category === category)
                            .map((p) => (
                              <option key={p.productId} value={p.productId}>
                                {p.name} ({money.format(p.unitPrice)}/{p.pricingUnit})
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Length (ft)" error={roomError('length')}>
                      <input type="number" min="0" step="0.1" className={inputClass} value={room.length} onChange={update('length')} />
                    </Field>
                    <Field label="Width (ft)" error={roomError('width')}>
                      <input type="number" min="0" step="0.1" className={inputClass} value={room.width} onChange={update('width')} />
                    </Field>
                  </div>
                  <Field label="Or total area (sq ft)" error={roomError('area')}>
                    <input type="number" min="0" step="0.1" className={inputClass} value={room.area} onChange={update('area')} />
                  </Field>

                  <Field label="Current flooring" error={roomError('currentFlooring')}>
                    <input
                      className={inputClass}
                      placeholder="Carpet, tile, concrete..."
                      value={room.currentFlooring}
                      onChange={update('currentFlooring')}
                    />
                  </Field>
                  <Field label="Installation pattern" error={roomError('pattern')}>
                    <select className={inputClass} value={room.pattern} onChange={update('pattern')}>
                      {PATTERNS.map((pattern) => (
                        <option key={pattern}>{pattern}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={room.removeExisting}
                    onChange={(e) => updateRoom(room.id, index, 'removeExisting', e.target.checked)}
                  />
                  Remove existing flooring
                </label>

                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span>
                    {roomArea(room).toLocaleString('en-US')} sq ft
                    {product && (estimate === null ? ' · Anna will price this product in your quote' : ` · ${money.format(estimate)}`)}
                  </span>
                  {rooms.length > 1 && (
                    <button type="button" onClick={() => removeRoom(room.id)} className="text-red-700 hover:underline">
                      Remove room
                    </button>
                  )}
                </div>
              </fieldset>
            )
          })}

          <button
            type="button"
            onClick={addRoom}
            className="mt-4 rounded-md border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink/30"
          >
            + Add room
          </button>

          {/* Photos */}
          <h2 className="mt-10 font-serif text-2xl font-medium">Photos</h2>
          <p className="mt-1 text-sm text-muted">
            Optional. Up to {MAX_PHOTOS} photos of the rooms (JPG, PNG or WebP, up to 5 MB each).
          </p>
          {photoError && (
            <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {photoError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative">
                <img src={photo.url} alt={photo.file.name} className="h-24 w-24 rounded-md border border-line object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove ${photo.file.name}`}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full border border-line bg-white text-sm leading-none hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-line bg-white text-center text-xs text-muted hover:border-ink/30">
                + Add photos
                <input type="file" multiple accept={PHOTO_TYPES.join(',')} onChange={handlePhotos} className="sr-only" />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">
            {photos.length} of {MAX_PHOTOS} added
          </p>

          {/* Notes */}
          <h2 className="mt-10 font-serif text-2xl font-medium">Notes</h2>
          <div className="mt-4">
            <Field label="Notes for Anna" error={errors.notes}>
              <textarea rows={3} className={inputClass} value={details.notes} onChange={setDetail('notes')} />
            </Field>
          </div>

          {/* Summary */}
          <div className="mt-10 border-t border-line pt-6">
            {formError && (
              <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {formError}
              </p>
            )}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} · {totalArea.toLocaleString('en-US')} sq ft
                </p>
                <p className="mt-1 font-serif text-2xl font-medium">Materials estimate {money.format(totalEstimate)}</p>
                <p className="mt-1 text-xs text-muted">
                  Before labor, removal, waste, and other charges.
                  {someNotEstimated && ' Some products are priced in your quote instead.'}
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-espresso px-5 py-3 text-sm font-medium text-white hover:bg-espresso-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send quote request'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

export default RequestQuote
