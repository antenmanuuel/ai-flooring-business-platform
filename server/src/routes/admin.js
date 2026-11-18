import { Router } from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../auth.js'

const router = Router()

// Every admin route needs a logged-in admin.
router.use(requireAuth, requireAdmin)

// GET /api/admin/overview
// The greeting and first name both come from MySQL: the time of day from the database
// clock, the name from the admin's row in Client. Also lists sign-ups waiting for approval.
router.get('/overview', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
       CASE
         WHEN HOUR(NOW()) < 12 THEN 'Good morning'
         WHEN HOUR(NOW()) < 18 THEN 'Good afternoon'
         ELSE 'Good evening'
       END AS greeting,
       first_name
     FROM Client
     WHERE client_id = ?`,
    [req.client.client_id],
  )

  const [pending] = await pool.execute(
    `SELECT client_id, CONCAT(first_name, ' ', last_name) AS full_name FROM Client
     WHERE role = 'client' AND status = 'pending'
     ORDER BY created_at`,
  )

  res.json({
    greeting: rows[0].greeting,
    firstName: rows[0].first_name,
    pendingSignups: pending.map((row) => ({ id: row.client_id, fullName: row.full_name })),
  })
})

// GET /api/admin/clients — every client account (admins are left out).
router.get('/clients', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT client_id, CONCAT(first_name, ' ', last_name) AS full_name,
            email, phone, address, city, state, status, created_at
     FROM Client
     WHERE role = 'client'
     ORDER BY client_id`,
  )
  res.json({
    clients: rows.map((row) => ({
      id: row.client_id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      status: row.status,
      createdAt: row.created_at,
    })),
  })
})

// PATCH /api/admin/clients/:id/status
// Body: { status: 'active' | 'disabled' }. Used for Approve, Disable and Re-enable.
router.patch('/clients/:id/status', async (req, res) => {
  const { status } = req.body ?? {}
  if (status !== 'active' && status !== 'disabled') {
    return res.status(400).json({ error: "Status must be 'active' or 'disabled'." })
  }

  const [result] = await pool.execute(
    "UPDATE Client SET status = ? WHERE client_id = ? AND role = 'client'",
    [status, req.params.id],
  )
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Client not found.' })
  res.json({ id: Number(req.params.id), status })
})

// DELETE /api/admin/clients/:id — used for Delete, and Decline on a pending sign-up.
router.delete('/clients/:id', async (req, res) => {
  const [result] = await pool.execute("DELETE FROM Client WHERE client_id = ? AND role = 'client'", [
    req.params.id,
  ])
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Client not found.' })
  res.status(204).end()
})

export default router
