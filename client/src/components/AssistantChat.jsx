import { useEffect, useRef, useState } from 'react'
import { streamChat } from './streamChat'

// How many earlier messages are sent along, so follow-up questions make sense.
const HISTORY_LIMIT = 6

// The two assistants share this component:
//   public - visitors and clients, answers from the guides and catalog (every page except /admin)
//   admin  - Anna's assistant in the dashboard, which also sees live requests, clients and products
const VARIANTS = {
  public: {
    endpoint: '/api/assistant/chat',
    button: 'Ask Anna Flooring',
    title: 'Ask Anna Flooring',
    subtitle: 'AI answers from our guides and catalog',
    greeting:
      'Hi! I can answer questions about flooring materials, care, choosing a floor for a room, installation and how quotes work. What would you like to know?',
    suggestions: ['Which floors are best with pets?', 'How do I clean hardwood?', 'How do I get a quote?'],
    placeholder: 'Ask about flooring…',
  },
  admin: {
    endpoint: '/api/assistant/admin/chat',
    button: 'Assistant',
    title: 'Assistant',
    subtitle: 'AI answers from your live requests, clients and catalog',
    greeting:
      'Hi Anna! Ask me about your requests, clients or products, or have me draft a reply to a client. I can read everything but change nothing.',
    suggestions: ['What needs my attention today?', 'Summarize the newest request', 'Draft a reply to the newest request'],
    placeholder: 'Ask about requests, clients, products…',
  },
}

// A chat button in the corner that opens a panel. Answers come from the AI assistant service (ai/),
// which searches the guides (and, for Anna, her live data) and cites the guides it used.
function AssistantChat({ variant = 'public' }) {
  const config = VARIANTS[variant]
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // { role: 'user' | 'assistant', content, sources? }
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [messages, open])

  // Stop a reply that's still streaming if the page goes away.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Updates the reply being written (always the last message).
  const updateReply = (change) =>
    setMessages((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], ...change(prev[prev.length - 1]) }])

  async function ask(question) {
    const text = question.trim()
    if (!text || busy) return
    const history = messages.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content }))
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '', sources: [] }])
    setInput('')
    setError('')
    setBusy(true)
    abortRef.current = new AbortController()
    try {
      await streamChat({
        endpoint: config.endpoint,
        message: text,
        history,
        signal: abortRef.current.signal,
        onSources: (sources) => updateReply(() => ({ sources })),
        onToken: (token) => updateReply((reply) => ({ content: reply.content + token })),
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      // Drop the empty reply and show why.
      setMessages((prev) => (prev[prev.length - 1]?.content ? prev : prev.slice(0, -1)))
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    ask(input)
  }

  function handleKeyDown(event) {
    // Enter sends; Shift+Enter starts a new line.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      ask(input)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-40 rounded-full bg-espresso px-5 py-3 text-sm font-medium text-white shadow-lg shadow-espresso/25 hover:bg-espresso-dark"
      >
        {config.button}
      </button>
    )
  }

  return (
    <section
      aria-label={config.title}
      className="fixed right-4 bottom-4 z-40 flex h-[min(36rem,calc(100vh-2rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-cream shadow-xl shadow-espresso/20"
    >
      <header className="flex items-center justify-between border-b border-line bg-sand/60 px-4 py-3">
        <div>
          <h2 className="font-serif text-lg font-medium">{config.title}</h2>
          <p className="text-xs text-muted">{config.subtitle}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-md px-2 py-1 text-xl leading-none text-muted hover:text-ink">
          ×
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm" aria-live="polite">
        <p className="rounded-lg bg-white px-3 py-2">{config.greeting}</p>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {config.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-white px-3 py-1 text-xs hover:border-copper hover:text-copper">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <p key={i} className="ml-8 rounded-lg bg-espresso px-3 py-2 whitespace-pre-wrap text-white">
              {m.content}
            </p>
          ) : (
            <div key={i} className="mr-4 rounded-lg bg-white px-3 py-2">
              <p className="whitespace-pre-wrap">{m.content || (busy && i === messages.length - 1 ? 'Thinking…' : '')}</p>
              {m.content && m.sources?.length > 0 && <Sources sources={m.sources} answer={m.content} />}
            </div>
          ),
        )}
        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line bg-white p-3">
        <label htmlFor="assistant-question" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-question"
          rows={1}
          maxLength={1000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder}
          className="flex-1 resize-none rounded-md border border-line px-3 py-2 text-sm focus:border-copper focus:ring-2 focus:ring-copper/25 focus:outline-none"
        />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-md bg-espresso px-4 text-sm font-medium text-white hover:bg-espresso-dark disabled:opacity-50">
          Send
        </button>
      </form>
    </section>
  )
}

// The sources the answer actually cites ([1], [2], ...), so readers can see where it came from.
function Sources({ sources, answer }) {
  const cited = sources.filter((s) => answer.includes(`[${s.number}]`))
  if (cited.length === 0) return null
  return (
    <ul className="mt-2 space-y-0.5 border-t border-line pt-2 text-xs text-muted" aria-label="Sources">
      {cited.map((s) => (
        <li key={s.number}>
          [{s.number}] {s.kind === 'catalog' ? 'Catalog: ' : ''}
          {s.title}
          {s.section && s.kind !== 'catalog' ? ` - ${s.section}` : ''}
        </li>
      ))}
    </ul>
  )
}

export default AssistantChat
