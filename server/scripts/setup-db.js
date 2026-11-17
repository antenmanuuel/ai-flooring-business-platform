// Sets up the database on macOS, Windows or Linux:
//   1. creates the database named in server/.env (DB_NAME) if it doesn't exist
//   2. creates the tables from sql/schema.sql
//   3. creates the admin account (or resets its password if it already exists)
//
// Run from the project root:   npm run db:setup
// or from the server folder:   npm run db:setup
//
// Safe to run as many times as you like; it never deletes existing data.

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

const ADMIN = {
  fullName: 'Anna Johnson',
  email: process.env.ADMIN_EMAIL || 'annajohnson@flooring.com',
  password: process.env.ADMIN_PASSWORD || 'Anna@12345',
}

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const schemaPath = fileURLToPath(new URL('../sql/schema.sql', import.meta.url))

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
}
const dbName = process.env.DB_NAME || 'anna_flooring_db'

const step = (msg) => console.log(`  • ${msg}`)

function fail(message, hint) {
  console.error(`\n✖ ${message}`)
  if (hint) console.error(`  ${hint}`)
  process.exit(1)
}

async function main() {
  console.log('\nSetting up the Anna Johnson Flooring database\n')

  if (!existsSync(envPath)) {
    fail(
      'server/.env not found.',
      'Copy server/.env.example to server/.env and fill in your MySQL password, then run this again.',
    )
  }
  if (!/^\w+$/.test(dbName)) fail(`DB_NAME "${dbName}" may only contain letters, numbers and underscores.`)

  let connection
  try {
    connection = await mysql.createConnection({ ...config, multipleStatements: true })
  } catch (err) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      fail(
        `MySQL rejected the login for user "${config.user}".`,
        'Check DB_USER and DB_PASSWORD in server/.env.',
      )
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      fail(
        `Could not reach MySQL at ${config.host}:${config.port}.`,
        'Make sure MySQL is installed and running (macOS: `brew services start mysql`; Windows: start the "MySQL" service), and check DB_HOST/DB_PORT in server/.env.',
      )
    }
    throw err
  }

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
    await connection.query(`USE \`${dbName}\``)
    step(`Database "${dbName}" is ready`)

    await connection.query(readFileSync(schemaPath, 'utf8'))
    step('Tables created (existing tables and data were left alone)')

    const passwordHash = await bcrypt.hash(ADMIN.password, 10)
    const [result] = await connection.execute(
      `INSERT INTO Client (full_name, email, password_hash, role)
       VALUES (?, ?, ?, 'admin') AS new_admin
       ON DUPLICATE KEY UPDATE
         full_name = new_admin.full_name,
         password_hash = new_admin.password_hash,
         role = 'admin'`,
      [ADMIN.fullName, ADMIN.email.toLowerCase(), passwordHash],
    )
    // affectedRows is 1 for a new row and 2 for an updated one.
    step(result.affectedRows === 1 ? 'Admin account created' : 'Admin account already existed; password reset')
  } finally {
    await connection.end()
  }

  console.log('\n✔ Done. Log in as the admin with:')
  console.log(`    Email:    ${ADMIN.email}`)
  console.log(`    Password: ${ADMIN.password}\n`)
}

main().catch((err) => fail(`Setup failed: ${err.message}`))
