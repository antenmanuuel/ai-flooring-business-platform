import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AssistantChat from './AssistantChat'
import { streamChat } from './streamChat'

// A streamed reply from the assistant service, split into uneven chunks like a real network.
function sseResponse(events, chunkSize = 7) {
  const text = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('')
  const bytes = new TextEncoder().encode(text)
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  })
  return { ok: true, status: 200, body }
}

const sources = [
  { number: 1, title: 'Caring for hardwood', section: 'Everyday cleaning', kind: 'guide' },
  { number: 2, title: 'Natural White Oak', section: 'Catalog', kind: 'catalog' },
  { number: 3, title: 'FAQ', section: 'Contact', kind: 'guide' },
]
const reply = [
  ['sources', sources],
  ['token', 'Sweep often and use a damp mop [1]. '],
  ['token', 'White oak is $7.50 per sq ft [2].'],
  ['done', {}],
]

afterEach(() => vi.unstubAllGlobals())

describe('streamChat', () => {
  it('reads sources and tokens from a stream split at arbitrary points', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(reply, 5)))
    const onSources = vi.fn()
    const tokens = []
    await streamChat({ message: 'Hi', history: [], onSources, onToken: (t) => tokens.push(t) })

    expect(onSources).toHaveBeenCalledWith(sources)
    expect(tokens.join('')).toBe('Sweep often and use a damp mop [1]. White oak is $7.50 per sq ft [2].')
    expect(fetch).toHaveBeenCalledWith('/api/assistant/chat', expect.objectContaining({ method: 'POST' }))
  })

  it("throws the server's message when a request is refused", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ detail: 'Please try again later.' }) })))
    await expect(streamChat({ message: 'Hi', history: [], onSources() {}, onToken() {} })).rejects.toThrow('Please try again later.')
  })

  it('throws when the stream reports an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse([['error', { error: 'Sorry, something went wrong.' }]])))
    await expect(streamChat({ message: 'Hi', history: [], onSources() {}, onToken() {} })).rejects.toThrow('Sorry, something went wrong.')
  })
})

describe('AssistantChat', () => {
  async function openChat() {
    render(<AssistantChat />)
    await userEvent.click(screen.getByRole('button', { name: 'Ask Anna Flooring' }))
  }

  it('opens from the corner button and closes again', async () => {
    await openChat()
    expect(screen.getByRole('region', { name: 'Ask Anna Flooring' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close chat' }))
    expect(screen.queryByRole('region', { name: 'Ask Anna Flooring' })).not.toBeInTheDocument()
  })

  it('streams the answer and lists only the sources it cites', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(reply)))
    await openChat()
    await userEvent.type(screen.getByLabelText('Your question'), 'How do I clean oak?{Enter}')

    expect(await screen.findByText(/White oak is \$7.50 per sq ft \[2\]\./)).toBeInTheDocument()
    expect(screen.getByText('How do I clean oak?')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Sources' })
    expect(list).toHaveTextContent('[1] Caring for hardwood - Everyday cleaning')
    expect(list).toHaveTextContent('[2] Catalog: Natural White Oak')
    expect(list).not.toHaveTextContent('FAQ') // retrieved but not cited
    expect(screen.getByLabelText('Your question')).toHaveValue('')
  })

  it('sends earlier messages along so follow-ups make sense', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(reply)))
    await openChat()
    await userEvent.click(screen.getByRole('button', { name: 'Which floors are best with pets?' }))
    await screen.findByText(/White oak/)
    await userEvent.type(screen.getByLabelText('Your question'), 'And for kitchens?{Enter}')
    await screen.findByText('And for kitchens?')

    const body = JSON.parse(fetch.mock.calls[1][1].body)
    expect(body.message).toBe('And for kitchens?')
    expect(body.history.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(body.history[0].content).toBe('Which floors are best with pets?')
  })

  it("the admin variant is Anna's assistant and asks the admin endpoint", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(reply)))
    render(<AssistantChat variant="admin" />)
    await userEvent.click(screen.getByRole('button', { name: 'Assistant' }))
    expect(screen.getByRole('region', { name: 'Assistant' })).toHaveTextContent('Hi Anna!')
    await userEvent.click(screen.getByRole('button', { name: 'What needs my attention today?' }))
    await screen.findByText(/White oak/)

    expect(fetch).toHaveBeenCalledWith('/api/assistant/admin/chat', expect.objectContaining({ method: 'POST' }))
  })

  it('shows why a question was refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({ detail: "The assistant isn't set up yet." }) })))
    await openChat()
    await userEvent.type(screen.getByLabelText('Your question'), 'Hello{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent("The assistant isn't set up yet.")
  })
})
