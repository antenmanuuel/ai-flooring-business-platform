import { Router } from 'express'
import type { RowDataPacket } from 'mysql2'
import pool from '../db.ts'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hello from the Express server!' })
})

interface DbInfo extends RowDataPacket {
  db: string | null
  version: string
}

// Checks that the server can reach MySQL
router.get('/db-health', async (_req, res) => {
  try {
    const [rows] = await pool.query<DbInfo[]>('SELECT DATABASE() AS db, VERSION() AS version')
    res.json({ status: 'ok', ...rows[0] })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ status: 'error', message })
  }
})

export default router
