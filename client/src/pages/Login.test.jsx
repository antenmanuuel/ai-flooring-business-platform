import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderPage, testAdmin, testClient } from '../test/renderPage'
import Login from './Login'

const renderLogin = (options) => renderPage(<Login />, { path: '/login', ...options })

describe('Login', () => {
  it('shows field errors instead of submitting an empty form', async () => {
    const { auth } = renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('sends a client to their dashboard after logging in', async () => {
    const login = vi.fn(async () => testClient)
    renderLogin({ auth: { login } })
    await userEvent.type(screen.getByLabelText('Email'), ' john@demo.com ')
    await userEvent.type(screen.getByLabelText('Password'), 'John@123456')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/client')
    expect(login).toHaveBeenCalledWith('john@demo.com', 'John@123456')
  })

  it('sends the admin to the admin dashboard', async () => {
    renderLogin({ auth: { login: async () => testAdmin } })
    await userEvent.type(screen.getByLabelText('Email'), 'anna@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Anna@12345')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByTestId('current-path')).toHaveTextContent('/admin')
  })

  it("shows the server's message, e.g. when too many attempts failed", async () => {
    const tooMany = { response: { status: 429, data: { error: 'Too many failed attempts. Please try again in 15 minutes.' } } }
    renderLogin({
      auth: {
        login: async () => {
          throw tooMany
        },
      },
    })
    await userEvent.type(screen.getByLabelText('Email'), 'john@demo.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed attempts')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('redirects someone who is already logged in', () => {
    renderLogin({ client: testClient })
    expect(screen.getByTestId('current-path')).toHaveTextContent('/client')
  })
})
