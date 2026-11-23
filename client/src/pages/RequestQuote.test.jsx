import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/client'
import { renderPage, testAdmin, testClient } from '../test/renderPage'
import RequestQuote from './RequestQuote'

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

// Two catalog products: one priced per square foot, one per box of 20 sq ft.
const products = [
  { productId: 2, name: 'White Oak', category: 'Hardwood', unitPrice: 7.5, pricingUnit: 'sq ft', coveragePerBox: null },
  { productId: 3, name: 'Gray Plank', category: 'Vinyl plank', unitPrice: 40, pricingUnit: 'box', coveragePerBox: 20 },
]

const renderForm = (client = testClient) => renderPage(<RequestQuote />, { path: '/client/request', client })

describe('RequestQuote', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: products })
    api.post.mockResolvedValue({ data: { id: 1002 } })
  })

  it("starts with the client's address as the service address", () => {
    renderForm()
    expect(screen.getByLabelText('Service address')).toHaveValue('4521 Woodward Ave, Detroit, MI 48201')
  })

  it('sends the admin to the admin dashboard', () => {
    renderForm(testAdmin)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin')
  })

  it('works out the area and the materials estimate', async () => {
    renderForm()
    await screen.findByRole('option', { name: /White Oak/ })

    await userEvent.selectOptions(screen.getByLabelText('Flooring product'), '2')
    await userEvent.type(screen.getByLabelText('Length (ft)'), '12')
    await userEvent.type(screen.getByLabelText('Width (ft)'), '10')

    // 120 sq ft × $7.50
    expect(screen.getByText('Materials estimate $900.00')).toBeInTheDocument()
  })

  it('rounds box products up to whole boxes', async () => {
    renderForm()
    await screen.findByRole('option', { name: /Gray Plank/ })

    await userEvent.selectOptions(screen.getByLabelText('Flooring product'), '3')
    await userEvent.type(screen.getByLabelText('Or total area (sq ft)'), '45')

    // 45 sq ft needs 3 boxes of 20 sq ft, at $40 each
    expect(screen.getByText('Materials estimate $120.00')).toBeInTheDocument()
  })

  it('shows what is missing before sending', async () => {
    renderForm()
    await userEvent.clear(screen.getByLabelText('Service address'))
    await userEvent.click(screen.getByRole('button', { name: 'Send quote request' }))

    expect(screen.getByText('Service address is required.')).toBeInTheDocument()
    expect(screen.getByText('Room name is required.')).toBeInTheDocument()
    expect(screen.getByText('Choose a flooring product.')).toBeInTheDocument()
    expect(screen.getByText('Enter the length and width, or the total area.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends the form as JSON in a "data" part and shows the request number', async () => {
    renderForm()
    await screen.findByRole('option', { name: /White Oak/ })

    await userEvent.type(screen.getByLabelText('Room name'), 'Kitchen')
    await userEvent.selectOptions(screen.getByLabelText('Flooring product'), '2')
    await userEvent.type(screen.getByLabelText('Or total area (sq ft)'), '200')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Remove existing flooring' }))
    await userEvent.click(screen.getByRole('button', { name: 'Send quote request' }))

    expect(api.post).toHaveBeenCalledTimes(1)
    const [path, formData] = api.post.mock.calls[0]
    expect(path).toBe('/client/requests')
    const data = JSON.parse(formData.get('data'))
    expect(data.address).toBe('4521 Woodward Ave, Detroit, MI 48201')
    expect(data.rooms).toEqual([
      expect.objectContaining({ name: 'Kitchen', productId: '2', area: '200', removeExisting: true }),
    ])
    expect(data.rooms[0]).not.toHaveProperty('id')

    expect(await screen.findByRole('status')).toHaveTextContent('R-1002')
  })

  it('shows server errors under the room fields', async () => {
    api.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: 'Please fix the highlighted fields.',
          fields: { 'rooms.0.productId': 'This product is no longer available. Choose another.' },
        },
      },
    })
    renderForm()
    await screen.findByRole('option', { name: /White Oak/ })
    await userEvent.type(screen.getByLabelText('Room name'), 'Kitchen')
    await userEvent.selectOptions(screen.getByLabelText('Flooring product'), '2')
    await userEvent.type(screen.getByLabelText('Or total area (sq ft)'), '200')
    await userEvent.click(screen.getByRole('button', { name: 'Send quote request' }))

    const room = screen.getByRole('group', { name: 'Room 1' })
    expect(await within(room).findByText('This product is no longer available. Choose another.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Please fix the highlighted fields.')
  })
})
