import mysql from 'mysql2/promise'

// Shared connection pool. Import this wherever you need to query the database:
//   import pool from '../db.ts'
//   const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [id])
// Always use ? placeholders for values to prevent SQL injection.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
})

export default pool
