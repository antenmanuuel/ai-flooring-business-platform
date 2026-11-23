import { expect, test } from '@playwright/test'
import { createApprovedClient, logIn, logOut } from './helpers.js'

// A client changes their password on the account page; only the new one works afterwards.
test('a client changes their password', async ({ page, baseURL }) => {
  const client = await createApprovedClient(baseURL, 'Omar')
  const newPassword = 'NewPassword456'

  await logIn(page, client.email, client.password)
  await page.getByRole('link', { name: 'Account' }).click()
  await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible()
  await expect(page.getByText(client.email)).toBeVisible()

  await page.getByLabel('Current password').fill(client.password)
  await page.getByLabel('New password', { exact: true }).fill(newPassword)
  await page.getByLabel('Confirm new password').fill(newPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByRole('status')).toHaveText('Your password has been changed.')

  // Still logged in on this browser after the change.
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back, Omar' })).toBeVisible()
  await logOut(page)

  await logIn(page, client.email, client.password)
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password.')

  await logIn(page, client.email, newPassword)
  await expect(page).toHaveURL(/\/client$/)
})
