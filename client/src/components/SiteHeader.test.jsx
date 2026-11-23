import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderPage, testAdmin, testClient } from '../test/renderPage'
import SiteHeader from './SiteHeader'

const renderHeader = (client, route = '/') => renderPage(<SiteHeader />, { path: route, client })

describe('SiteHeader', () => {
  it('offers log in and register to visitors', () => {
    renderHeader(null)
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Register' })).toHaveAttribute('href', '/register')
  })

  it("hides the link to the page you're already on", () => {
    renderHeader(null, '/login')
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('gives clients their dashboard and account page', () => {
    renderHeader(testClient)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/client')
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/client/account')
  })

  it('gives the admin the admin dashboard and no account page', () => {
    renderHeader(testAdmin)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/admin')
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument()
  })

  it('logs out and goes to the home page', async () => {
    const { auth } = renderPage(<SiteHeader />, { path: '/client', route: '/client', client: testClient })
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(auth.logout).toHaveBeenCalled()
    expect(await screen.findByTestId('current-path')).toHaveTextContent('/')
  })
})
