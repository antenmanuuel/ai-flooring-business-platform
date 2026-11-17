import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hello from the Express server!' })
})

// Checks that the server can reach MySQL
router.get('/db-health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db, VERSION() AS version')
    res.json({ status: 'ok', ...rows[0] })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
})

export default router
