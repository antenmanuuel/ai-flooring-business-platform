import { readFileSync } from 'node:fs'
import { expect, request } from '@playwright/test'
import { E2E_ADMIN } from '../playwright.config.js'

export { E2E_ADMIN }
export const PHOTO = new URL('../src/assets/hero-living-room.jpg', import.meta.url).pathname

// A unique email per call, so test runs never clash with accounts from earlier runs.
export const uniqueEmail = (name) => `${name}-${Date.now()}-${Math.floor(Math.random() * 1000)}@e2e.test`

// An API session of its own (separate cookies from the browser page).
async function apiSession(baseURL, email, password) {
  const api = await request.newContext({ baseURL })
  if (email) {
    const res = await api.post('/api/auth/login', { data: { email, password } })
    expect(res.ok(), `log in as ${email}`).toBeTruthy()
  }
  return api
}

// Registers a client through the API and approves it as the admin. Returns { email, password }.
export async function createApprovedClient(baseURL, firstName = 'Zed') {
  const email = uniqueEmail(firstName.toLowerCase())
  const password = 'Password123'
  const anon = await apiSession(baseURL)
  const res = await anon.post('/api/auth/register', {
    data: {
      firstName,
      lastName: 'Tester',
      email,
      address: '1 Main St',
      city: 'Detroit',
      state: 'MI',
      zipCode: '48201',
      country: 'USA',
      phone: '3135550100',
      password,
    },
  })
  expect(res.status()).toBe(201)
  const { client } = await res.json()

  const admin = await apiSession(baseURL, E2E_ADMIN.email, E2E_ADMIN.password)
  expect((await admin.patch(`/api/admin/clients/${client.id}/status`, { data: { status: 'active' } })).ok()).toBeTruthy()
  await Promise.all([anon.dispose(), admin.dispose()])
  return { email, password, firstName }
}

// Adds a product priced at $7.50 per sq ft (with a photo) through the admin API. Returns its name.
export async function createProduct(baseURL) {
  const name = `E2E Oak ${Date.now()}`
  const admin = await apiSession(baseURL, E2E_ADMIN.email, E2E_ADMIN.password)
  const res = await admin.post('/api/admin/products', {
    multipart: {
      name,
      category: 'Hardwood',
      manufacturer: 'Bruce',
      style: 'Plank',
      color: 'Natural',
      unitPrice: '7.50',
      pricingUnit: 'sq ft',
      image: { name: 'oak.jpg', mimeType: 'image/jpeg', buffer: readFileSync(PHOTO) },
    },
  })
  expect(res.status()).toBe(201)
  await admin.dispose()
  return name
}

// Logs in through the login page.
export async function logIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

// Logs out and waits until the site shows the logged-out header, so the session is really over
// before the next step (opening another page too soon would cancel the logout request).
export async function logOut(page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
}
