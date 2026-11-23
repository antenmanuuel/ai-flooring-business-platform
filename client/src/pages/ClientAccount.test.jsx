import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/client'
import { renderPage, testAdmin, testClient } from '../test/renderPage'
import ClientAccount from './ClientAccount'

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

const renderAccount = (client = testClient) => renderPage(<ClientAccount />, { path: '/client/account', client })

async function fillPasswords({ current = 'John@123456', next = 'NewPassword456', confirm = next } = {}) {
  await userEvent.type(screen.getByLabelText('Current password'), current)
  await userEvent.type(screen.getByLabelText('New password'), next)
  await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ClientAccount', () => {
  beforeEach(() => {
    api.post.mockResolvedValue({ status: 204 })
  })

  it("shows the client's details", () => {
    renderAccount()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@demo.com')).toBeInTheDocument()
    expect(screen.getByText('Detroit, MI 48201')).toBeInTheDocument()
  })

  it('sends the admin to the admin dashboard', () => {
    renderAccount(testAdmin)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin')
  })

  it('sends visitors to the login page', () => {
    renderAccount(null)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
  })

  it('changes the password and clears the form', async () => {
    renderAccount()
    await fillPasswords()

    expect(api.post).toHaveBeenCalledWith('/client/account/password', {
      currentPassword: 'John@123456',
      newPassword: 'NewPassword456',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been changed.')
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it("checks the rules before sending and doesn't call the server", async () => {
    renderAccount()
    await fillPasswords({ next: 'short', confirm: 'different' })

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows a wrong current password under its field', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: 'Current password is incorrect.', fields: { currentPassword: 'Current password is incorrect.' } },
      },
    })
    renderAccount()
    await fillPasswords({ current: 'not-my-password' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect.')
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
  })
})
