import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import api from '../api/client'
import { renderPage, testAdmin, testClient } from '../test/renderPage'
import Home from './Home'

vi.mock('../api/client', () => ({ default: { get: vi.fn() } }))

const catalog = [
  { productId: 2, name: 'White Oak', category: 'Hardwood', unitPrice: 7.5, pricingUnit: 'sq ft', imageUrl: null },
  { productId: 3, name: 'Gray Plank', category: 'Vinyl plank', unitPrice: 40, pricingUnit: 'box', imageUrl: '/api/uploads/products/a.jpg' },
]

describe('Home', () => {
  it('lists the catalog from the server', async () => {
    api.get.mockResolvedValue({ data: catalog })
    renderPage(<Home />)

    expect(await screen.findByRole('heading', { name: 'White Oak' })).toBeInTheDocument()
    expect(screen.getByText('$7.50')).toBeInTheDocument()
    expect(screen.getByText('Photo coming soon')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gray Plank' })).toHaveAttribute('src', '/api/uploads/products/a.jpg')
    expect(api.get).toHaveBeenCalledWith('/products')
  })

  it('says so when the catalog is empty or fails to load', async () => {
    api.get.mockResolvedValue({ data: [] })
    renderPage(<Home />)
    expect(await screen.findByText('Our catalog is being updated. Check back soon.')).toBeInTheDocument()
  })

  it('shows an error when the catalog fails to load', async () => {
    api.get.mockRejectedValue(new Error('offline'))
    renderPage(<Home />)
    expect(await screen.findByText(/couldn't load our materials/)).toBeInTheDocument()
  })

  it('asks visitors to register, and sends logged-in clients to their dashboard', async () => {
    api.get.mockResolvedValue({ data: [] })
    const { unmount } = renderPage(<Home />)
    expect(screen.getByRole('link', { name: 'Register to request a quote' })).toBeInTheDocument()
    unmount()

    renderPage(<Home />, { client: testClient })
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/client')
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument()
    await screen.findByText('Our catalog is being updated. Check back soon.')
  })

  it("doesn't show the client steps to the admin", async () => {
    api.get.mockResolvedValue({ data: [] })
    renderPage(<Home />, { client: testAdmin })
    expect(screen.queryByRole('heading', { name: 'How it works' })).not.toBeInTheDocument()
    await screen.findByText('Our catalog is being updated. Check back soon.')
  })
})
