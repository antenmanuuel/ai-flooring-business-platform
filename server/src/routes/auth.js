import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../db.js'
import { clearAuthCookie, requireAuth, setAuthCookie, toPublicClient } from '../auth.js'

const router = Router()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 7 to 20 characters: digits, spaces, and + ( ) - . e.g. (555) 123-4567
const PHONE_PATTERN = /^[0-9+()\-. ]{7,20}$/
// 3 to 10 letters, digits, spaces or dashes, so non-US postal codes work too, e.g. 48201 or 48201-1234
const ZIP_PATTERN = /^[A-Za-z0-9\- ]{3,10}$/
const MIN_PASSWORD_LENGTH = 8

// Compared against when no account matches, so "wrong email" and "wrong password"
// take the same time and can't be told apart.
const DUMMY_HASH = await bcrypt.hash('not-a-real-password', 10)

const readString = (value) => (typeof value === 'string' ? value : '')

// POST /api/auth/register
// Body: { fullName, email, address, city, state, zipCode, country, phone, password }
// New accounts always get the default 'client' role; admins are created only by `npm run db:setup`.
router.post('/register', async (req, res) => {
  const fullName = readString(req.body?.fullName).trim()
  const email = readString(req.body?.email).trim().toLowerCase()
  const address = readString(req.body?.address).trim()
  const city = readString(req.body?.city).trim()
  const state = readString(req.body?.state).trim()
  const zipCode = readString(req.body?.zipCode).trim()
  const country = readString(req.body?.country).trim()
  const phone = readString(req.body?.phone).trim()
  const password = readString(req.body?.password)

  const errors = {}
  if (!fullName) errors.fullName = 'Full name is required.'
  else if (fullName.length > 100) errors.fullName = 'Full name must be 100 characters or fewer.'
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.'
  else if (email.length > 255) errors.email = 'Email must be 255 characters or fewer.'
  if (!address) errors.address = 'Street address is required.'
  else if (address.length > 255) errors.address = 'Street address must be 255 characters or fewer.'
  if (!city) errors.city = 'City is required.'
  else if (city.length > 100) errors.city = 'City must be 100 characters or fewer.'
  if (!state) errors.state = 'State is required.'
  else if (state.length > 100) errors.state = 'State must be 100 characters or fewer.'
  if (!ZIP_PATTERN.test(zipCode)) errors.zipCode = 'Enter a valid ZIP code.'
  if (!country) errors.country = 'Country is required.'
  else if (country.length > 100) errors.country = 'Country must be 100 characters or fewer.'
  if (!PHONE_PATTERN.test(phone)) errors.phone = 'Enter a valid phone number.'
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  } else if (password.length > 72) {
    // bcrypt only uses the first 72 bytes of a password
    errors.password = 'Password must be 72 characters or fewer.'
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const [result] = await pool.execute(
      `INSERT INTO Client (full_name, email, address, city, state, zip_code, country, phone, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, address, city, state, zipCode, country, phone, passwordHash],
    )
    return res.status(201).json({
      client: { id: result.insertId, fullName, email, role: 'client' },
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        fields: { email: 'An account with this email already exists.' },
      })
    }
    throw err
  }
})

// POST /api/auth/login
// Body: { email, password }. On success sets the httpOnly login cookie and returns the client.
router.post('/login', async (req, res) => {
  const email = readString(req.body?.email).trim().toLowerCase()
  const password = readString(req.body?.password)

  const errors = {}
  if (!email) errors.email = 'Email is required.'
  if (!password) errors.password = 'Password is required.'
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Please fill in your email and password.', fields: errors })
  }

  const [rows] = await pool.execute(
    'SELECT client_id, full_name, email, password_hash, role FROM Client WHERE email = ?',
    [email],
  )
  const client = rows[0]
  const passwordOk = await bcrypt.compare(password, client?.password_hash ?? DUMMY_HASH)

  if (!client || !passwordOk) {
    // Same message either way so the form doesn't reveal which emails have accounts.
    return res.status(401).json({ error: 'Incorrect email or password.' })
  }

  setAuthCookie(res, client)
  return res.json({ client: toPublicClient(client) })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.status(204).end()
})

// GET /api/auth/me — the logged-in client, or 401.
router.get('/me', requireAuth, (req, res) => {
  res.json({ client: toPublicClient(req.client) })
})

export default router
