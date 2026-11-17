import { Router } from 'express'
import pool from '../db.js'
import { requireAdmin, requireAuth } from '../auth.js'

const router = Router()

// Every admin route needs a logged-in admin.
router.use(requireAuth, requireAdmin)

// GET /api/admin/overview
// The greeting and first name both come from MySQL: the time of day from the database
// clock, the name from the admin's row in Client.
router.get('/overview', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
       CASE
         WHEN HOUR(NOW()) < 12 THEN 'Good morning'
         WHEN HOUR(NOW()) < 18 THEN 'Good afternoon'
         ELSE 'Good evening'
       END AS greeting,
       -- first name = everything before the first space in full_name
       SUBSTRING_INDEX(full_name, ' ', 1) AS first_name
     FROM Client
     WHERE client_id = ?`,
    [req.client.client_id],
  )
  res.json({ greeting: rows[0].greeting, firstName: rows[0].first_name })
})

export default router
