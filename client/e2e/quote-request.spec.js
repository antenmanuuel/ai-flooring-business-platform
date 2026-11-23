import { expect, test } from '@playwright/test'
import { E2E_ADMIN, PHOTO, createApprovedClient, createProduct, logIn, logOut } from './helpers.js'

// A client sends a quote request with a photo, sees it on their dashboard, and the admin sees it too.
test('a client sends a quote request and the admin sees it', async ({ page, baseURL }) => {
  const productName = await createProduct(baseURL)
  const client = await createApprovedClient(baseURL, 'Rita')

  await logIn(page, client.email, client.password)
  await page.getByRole('link', { name: '+ Request a quote' }).click()

  await expect(page.getByLabel('Service address')).toHaveValue('1 Main St, Detroit, MI 48201')
  await page.getByLabel('Room name').fill('Kitchen')
  await page.getByLabel('Flooring product').selectOption({ label: `${productName} ($7.50/sq ft)` })
  await page.getByLabel('Length (ft)').fill('12')
  await page.getByLabel('Width (ft)').fill('10')
  await expect(page.getByText('Materials estimate $900.00')).toBeVisible() // 120 sq ft × $7.50

  await page.locator('input[type="file"]').setInputFiles(PHOTO)
  await expect(page.getByText('1 of 5 added')).toBeVisible()

  await page.getByRole('button', { name: 'Send quote request' }).click()
  const confirmation = page.getByRole('status')
  await expect(confirmation).toContainText('Quote requested')
  const requestNumber = (await confirmation.locator('p').first().textContent()).trim() // e.g. "R-1003"
  expect(requestNumber).toMatch(/^R-\d+$/)

  // The client's dashboard and project page.
  await page.getByRole('link', { name: 'Back to my dashboard' }).click()
  await page.getByRole('link', { name: 'Kitchen' }).click()
  await expect(page.getByText(`${requestNumber} · 120 sq ft`)).toBeVisible()
  await expect(page.getByRole('img', { name: 'Photo 1 of this project' })).toBeVisible()

  // The admin's Requests page.
  await logOut(page)
  await logIn(page, E2E_ADMIN.email, E2E_ADMIN.password)
  await page.getByRole('link', { name: 'Requests' }).click()
  const row = page.getByRole('row').filter({ hasText: requestNumber })
  await expect(row).toContainText('Rita Tester')
  await expect(row).toContainText('120 sq ft')
  await expect(row).toContainText('New')
})
