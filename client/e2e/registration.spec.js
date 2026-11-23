import { expect, test } from '@playwright/test'
import { E2E_ADMIN, logIn, logOut, uniqueEmail } from './helpers.js'

// The whole sign-up flow through the website: register, wait for approval, get approved, log in.
test('a new client registers, is approved by the admin, and logs in', async ({ page }) => {
  const email = uniqueEmail('jane')
  const password = 'Password123'

  await page.goto('/register')
  await page.getByLabel('First name').fill('Jane')
  await page.getByLabel('Last name').fill('Smith')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Street address').fill('12 Oak St')
  await page.getByLabel('City').fill('Detroit')
  await page.getByLabel('State').fill('MI')
  await page.getByLabel('ZIP code').fill('48201')
  await page.getByLabel('Phone number').fill('(313) 555-0199')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Register' }).click()
  await expect(page.getByRole('heading', { name: 'You have registered' })).toBeVisible()

  // Not approved yet.
  await logIn(page, email, password)
  await expect(page.getByRole('alert')).toHaveText('Your account is waiting for approval. Please try again later.')

  // The admin approves the account on the Clients page.
  await logIn(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await expect(page).toHaveURL(/\/admin$/)
  await page.getByRole('link', { name: 'Clients' }).click()
  await page.getByLabel('Search clients').fill(email)
  const row = page.getByRole('row').filter({ hasText: email })
  await row.getByRole('button', { name: 'Approve' }).click()
  await expect(row.getByRole('button', { name: 'Disable' })).toBeVisible()
  await logOut(page)

  // Now the client can log in and lands on their dashboard.
  await logIn(page, email, password)
  await expect(page).toHaveURL(/\/client$/)
  await expect(page.getByRole('heading', { name: 'Welcome back, Jane' })).toBeVisible()
})
