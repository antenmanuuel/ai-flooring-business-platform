import jwt from 'jsonwebtoken'
import pool from './db.js'

const { JWT_SECRET } = process.env
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to server/.env (see .env.example).')
}

export const AUTH_COOKIE = 'token'
const SESSION_DAYS = 7

// httpOnly keeps the token out of reach of page JavaScript; sameSite=lax blocks cross-site form posts.
export const authCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function setAuthCookie(res, client) {
  const token = jwt.sign({ sub: String(client.client_id), role: client.role }, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  })
  res.cookie(AUTH_COOKIE, token, { ...authCookieOptions, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 })
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, authCookieOptions)
}

// Shape sent to the browser. Never include password_hash.
export function toPublicClient(row) {
  return { id: row.client_id, fullName: row.full_name, email: row.email, role: row.role }
}

// Middleware: rejects the request with 401 unless it carries a valid login cookie.
// On success sets req.client to the current database row (so role changes and deletions apply immediately).
export async function requireAuth(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) return res.status(401).json({ error: 'Not logged in.' })

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'Your session has expired. Please log in again.' })
  }

  const [rows] = await pool.execute(
    'SELECT client_id, full_name, email, role FROM Client WHERE client_id = ?',
    [payload.sub],
  )
  if (rows.length === 0) {
    clearAuthCookie(res)
    return res.status(401).json({ error: 'Not logged in.' })
  }

  req.client = rows[0]
  next()
}

// Middleware: use after requireAuth to restrict a route to admins.
export function requireAdmin(req, res, next) {
  if (req.client?.role !== 'admin') return res.status(403).json({ error: 'Admins only.' })
  next()
}
