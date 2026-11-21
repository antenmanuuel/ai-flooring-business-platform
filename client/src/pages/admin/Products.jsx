import { useEffect, useState } from 'react'
import api from '../../api/client'

// The server's error message, or a fallback if there isn't one.
const errorMessage = (err, fallback) => err.response?.data?.error || fallback

const EMPTY_FORM = {
  name: '',
  category: 'Hardwood',
  manufacturer: '',
  style: '',
  color: '',
  unitPrice: '',
  pricingUnit: 'sq ft',
  dimensions: '',
  coveragePerBox: '',
  description: '',
}

const CATEGORIES = ['Hardwood', 'Engineered wood', 'Vinyl plank', 'Porcelain tile', 'Ceramic tile', 'Laminate', 'Carpet']
const PRICING_UNITS = [
  { value: 'sq ft', label: 'per sq ft' },
  { value: 'box', label: 'per box' },
  { value: 'piece', label: 'per piece' },
  { value: 'roll', label: 'per roll' },
]

// A plain number with at most 2 decimal places, e.g. 7, 7.5 or 7.50.
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/

// Same rules as the server (AdminProductController), checked live as Anna types.
function validate(form) {
  const errors = {}
  const required = [
    ['name', 'Name', 100],
    ['manufacturer', 'Manufacturer', 100],
    ['style', 'Material / style', 100],
    ['color', 'Color', 50],
  ]
  for (const [field, label, max] of required) {
    const value = form[field].trim()
    if (!value) errors[field] = `${label} is required.`
    else if (value.length > max) errors[field] = `${label} must be ${max} characters or fewer.`
  }

  const price = Number(form.unitPrice)
  if (String(form.unitPrice).trim() === '' || !Number.isFinite(price)) errors.unitPrice = 'Unit price is required.'
  else if (price < 0) errors.unitPrice = "Unit price can't be negative."
  else if (!MONEY_PATTERN.test(String(form.unitPrice).trim()))
    errors.unitPrice = 'Enter a price like 7.50 (up to 2 decimal places).'
  else if (price > 99999999.99) errors.unitPrice = 'Unit price is too large.'

  if (form.dimensions.trim().length > 50) errors.dimensions = 'Dimensions must be 50 characters or fewer.'

  if (String(form.coveragePerBox).trim() !== '') {
    const coverage = Number(form.coveragePerBox)
    if (!Number.isFinite(coverage) || coverage < 0 || coverage > 999999.99 || !MONEY_PATTERN.test(String(form.coveragePerBox).trim())) {
      errors.coveragePerBox = 'Coverage must be a number between 0 and 999,999.99, with up to 2 decimal places.'
    }
  }
  return errors
}

// Same image rules as the server (ImageStorage).
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return 'Image must be a JPG, PNG or WebP file.'
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller.'
  return ''
}

const allTouched = Object.fromEntries(Object.keys(EMPTY_FORM).map((name) => [name, true]))

// Red border when the field has an error, like the registration form.
const inputClass = (error) =>
  `w-full rounded-md border bg-white px-3 py-2 text-ink focus:ring-2 focus:outline-none ${
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-line focus:border-espresso focus:ring-espresso/15'
  }`

// Label, the input itself, and a red error message underneath.
function Field({ name, label, error, children }) {
  return (
    <div>
      <label htmlFor={`product-${name}`} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {error && (
        <p id={`product-${name}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  // Fields Anna has typed in; their errors show live. Server errors show regardless.
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  // The photo: a newly chosen file (or null) and the preview shown in the form.
  // The preview is the saved photo's URL when editing, or a local URL for a new file.
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [imageError, setImageError] = useState('')

  const clientErrors = validate(form)
  const errorFor = (name) => (touched[name] ? clientErrors[name] : undefined) || serverErrors[name]

  // Props shared by every input: id, value, change/blur handlers, red border and error link.
  function fieldProps(name) {
    const error = errorFor(name)
    return {
      id: `product-${name}`,
      name,
      value: form[name],
      onChange: (e) => {
        setForm({ ...form, [name]: e.target.value })
        if (serverErrors[name]) setServerErrors({ ...serverErrors, [name]: undefined })
        setFormError('')
      },
      onBlur: (e) => {
        if (e.target.value) setTouched({ ...touched, [name]: true })
      },
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `product-${name}-error` : undefined,
      className: inputClass(error),
    }
  }

  function resetFormState() {
    setFormError('')
    setTouched({})
    setServerErrors({})
    setImageFile(null)
    setImageError('')
  }

  // Shows a new preview and frees the memory of the previous local file preview.
  function replacePreview(url) {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImagePreview(url)
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    e.target.value = '' // lets Anna pick the same file again after removing it
    if (!file) return

    const problem = validateImage(file)
    setImageError(problem)
    setServerErrors({ ...serverErrors, image: undefined })
    if (problem) return
    setImageFile(file)
    replacePreview(URL.createObjectURL(file))
  }

  function handleRemoveImage() {
    setImageFile(null)
    replacePreview('')
    setImageError('')
  }

  // 1. Load all products from the database
  useEffect(() => {
    api
      .get('/admin/products')
      .then(({ data }) => setProducts(data))
      .catch((err) => setError(errorMessage(err, 'Failed to load products')))
      .finally(() => setLoading(false))
  }, [])

  // Open modal for creating a new product
  function handleOpenAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    resetFormState()
    replacePreview('')
    setModalOpen(true)
  }

  // Open modal pre-filled with the selected row's values for updating
  function handleOpenEdit(product) {
    setEditingId(product.productId)
    setForm({
      name: product.name || '',
      category: product.category || 'Hardwood',
      manufacturer: product.manufacturer || '',
      style: product.style || '',
      color: product.color || '',
      unitPrice: product.unitPrice ?? '',
      pricingUnit: product.pricingUnit || 'sq ft',
      dimensions: product.dimensions || '',
      coveragePerBox: product.coveragePerBox ?? '',
      description: product.description || '',
    })
    resetFormState()
    replacePreview(product.imageUrl || '')
    setModalOpen(true)
  }

  // 2. CREATE or UPDATE product in the SQL table
  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    setTouched(allTouched)
    // A rejected photo is never kept, so it doesn't block saving.
    if (Object.keys(clientErrors).length > 0) return

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      manufacturer: form.manufacturer.trim(),
      style: form.style.trim(),
      color: form.color.trim(),
      unitPrice: parseFloat(form.unitPrice),
      pricingUnit: form.pricingUnit,
      dimensions: form.dimensions.trim() || null,
      coveragePerBox: form.coveragePerBox !== '' ? parseFloat(form.coveragePerBox) : null,
      description: form.description.trim() || null,
    }

    // Sent as multipart/form-data so the photo file can go along with the text fields.
    const formData = new FormData()
    for (const [key, value] of Object.entries(payload)) {
      if (value !== null) formData.append(key, value)
    }
    if (imageFile) formData.append('image', imageFile)
    else if (!imagePreview) formData.append('removeImage', 'true') // no photo chosen, or the old one was removed
    const config = { headers: { 'Content-Type': 'multipart/form-data' } }

    try {
      const { data: savedProduct } = editingId
        ? await api.put(`/admin/products/${editingId}`, formData, config)
        : await api.post('/admin/products', formData, config)

      if (editingId) {
        // Update row immediately in UI state
        setProducts((prev) =>
          prev.map((item) => (item.productId === editingId ? savedProduct : item))
        )
      } else {
        // Append new row immediately in UI state
        setProducts((prev) => [...prev, savedProduct])
      }

      setModalOpen(false)
    } catch (err) {
      const fields = err.response?.data?.fields
      if (fields) {
        setServerErrors(fields)
        setFormError('Please fix the highlighted fields.')
      } else {
        setFormError(errorMessage(err, editingId ? 'Failed to update product' : 'Failed to add product'))
      }
    } finally {
      setSaving(false)
    }
  }

  // 3. DELETE product from the SQL table
  async function handleDelete(productId, productName) {
    if (!window.confirm(`Remove "${productName}" from the catalog?`)) return

    try {
      await api.delete(`/admin/products/${productId}`)

      // Remove row immediately from UI state
      setProducts((prev) => prev.filter((item) => item.productId !== productId))
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete product'))
    }
  }

  function formatSizeCoverage(p) {
    const parts = []
    if (p.dimensions) parts.push(p.dimensions)
    if (p.coveragePerBox) parts.push(`${Number(p.coveragePerBox)} sq ft/box`)
    return parts.length > 0 ? parts.join(' · ') : '—'
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-medium text-ink">Flooring catalog</h1>
          <p className="mt-1 text-sm text-muted">Products and prices clients can choose from.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="cursor-pointer rounded-md bg-espresso px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-espresso-dark"
        >
          Add product
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white/75">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-sand/60 text-[11px] font-semibold tracking-wider text-muted uppercase">
              <th className="px-5 py-3.5">Product</th>
              <th className="px-5 py-3.5">Category</th>
              <th className="px-5 py-3.5">Brand / Style</th>
              <th className="px-5 py-3.5">Color</th>
              <th className="px-5 py-3.5">Price</th>
              <th className="px-5 py-3.5">Size / Coverage</th>
              <th className="px-5 py-3.5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  No products found. Click "Add product" to create one.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.productId} className="align-top transition hover:bg-sand/25">
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-md border border-line object-cover" />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded-md border border-dashed border-line bg-sand/40" />
                      )}
                      <div>
                        <div className="font-medium text-ink">{p.name}</div>
                        {p.description && (
                          <div className="mt-1 max-w-[200px] text-xs leading-relaxed text-muted">
                            {p.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink">{p.category}</td>
                  <td className="px-5 py-4 text-ink">
                    {p.manufacturer} · {p.style}
                  </td>
                  <td className="px-5 py-4 text-ink">{p.color}</td>
                  <td className="px-5 py-4 whitespace-nowrap text-ink">
                    ${Number(p.unitPrice).toFixed(2)}/{p.pricingUnit}
                  </td>
                  <td className="px-5 py-4 text-ink">{formatSizeCoverage(p)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="cursor-pointer rounded-md border border-line bg-cream px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-sand"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.productId, p.name)}
                        className="cursor-pointer rounded-md border border-red-200 bg-cream px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-cream p-6 shadow-xl">
            <h2 className="mb-4 font-serif text-xl font-semibold text-ink">
              {editingId ? 'Edit product' : 'Add product'}
            </h2>

            {formError && (
              <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5 text-sm">
              <Field name="name" label="Product Name *" error={errorFor('name')}>
                <input type="text" maxLength={100} placeholder="e.g., Solid oak hardwood" {...fieldProps('name')} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field name="category" label="Category / Type *">
                  <select {...fieldProps('category')}>
                    {/* Also list the product's current category if it isn't one of the standard ones. */}
                    {(CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES]).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field name="color" label="Color *" error={errorFor('color')}>
                  <input type="text" maxLength={50} placeholder="e.g., Natural" {...fieldProps('color')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field name="manufacturer" label="Manufacturer / Brand *" error={errorFor('manufacturer')}>
                  <input type="text" maxLength={100} placeholder="e.g., Bruce" {...fieldProps('manufacturer')} />
                </Field>
                <Field name="style" label="Material / Style *" error={errorFor('style')}>
                  <input type="text" maxLength={100} placeholder='e.g., Plank 3¼"' {...fieldProps('style')} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field name="unitPrice" label="Unit Price ($) *" error={errorFor('unitPrice')}>
                  <input type="number" step="0.01" min="0" placeholder="7.50" {...fieldProps('unitPrice')} />
                </Field>
                <Field name="pricingUnit" label="Pricing Unit *">
                  <select {...fieldProps('pricingUnit')}>
                    {PRICING_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field name="dimensions" label="Dimensions (optional)" error={errorFor('dimensions')}>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder={`e.g., 12" × 24" or 12' roll`}
                    {...fieldProps('dimensions')}
                  />
                </Field>
                <Field name="coveragePerBox" label="Sq. Ft. / Box (optional)" error={errorFor('coveragePerBox')}>
                  <input type="number" step="0.01" min="0" placeholder="22.0" {...fieldProps('coveragePerBox')} />
                </Field>
              </div>

              <Field name="description" label="Description (optional)" error={errorFor('description')}>
                <textarea rows={2} placeholder="e.g., Classic solid oak, refinishable." {...fieldProps('description')} />
              </Field>

              <Field name="image" label="Photo (optional)" error={imageError || serverErrors.image}>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Product preview" className="h-20 w-20 rounded-md border border-line object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed border-line bg-white text-xs text-muted">
                      No photo
                    </div>
                  )}
                  <div className="flex flex-col items-start gap-1.5">
                    <label
                      htmlFor="product-image"
                      className="cursor-pointer rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-sand"
                    >
                      {imagePreview ? 'Replace photo' : 'Choose photo'}
                    </label>
                    <input
                      id="product-image"
                      type="file"
                      accept={IMAGE_TYPES.join(',')}
                      onChange={handleImageChange}
                      aria-describedby={imageError || serverErrors.image ? 'product-image-error' : undefined}
                      className="sr-only"
                    />
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="cursor-pointer text-xs font-medium text-red-600 hover:underline"
                      >
                        Remove photo
                      </button>
                    )}
                    <span className="text-xs text-muted">JPG, PNG or WebP, up to 5 MB.</span>
                  </div>
                </div>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer rounded-md border border-line bg-cream px-4 py-2 font-medium text-ink hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="cursor-pointer rounded-md bg-espresso px-4 py-2 font-medium text-cream hover:bg-espresso-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update product' : 'Save product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}