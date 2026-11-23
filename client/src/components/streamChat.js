// Sends a question to the AI assistant and reads its streamed reply. `endpoint` is
// /api/assistant/chat (public) or /api/assistant/admin/chat (Anna's; the login cookie goes along).
// The reply is Server-Sent Events: "sources" once, then "token" pieces of the answer, then "done"
// (or "error"). Calls onSources(list) and onToken(text) as they arrive.
export async function streamChat({ endpoint = '/api/assistant/chat', message, history, onSources, onToken, signal }) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
    signal,
  })

  if (!response.ok) {
    throw new Error(await errorMessage(response))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Events are separated by a blank line; the last piece may be incomplete, so keep it for later.
    const events = buffer.split('\n\n')
    buffer = events.pop()
    for (const raw of events) {
      const event = parseEvent(raw)
      if (event?.type === 'sources') onSources?.(event.data)
      else if (event?.type === 'token') onToken(event.data)
      else if (event?.type === 'error') throw new Error(event.data.error)
    }
  }
}

function parseEvent(raw) {
  let type = 'message'
  let data = ''
  for (const line of raw.split('\n')) {
    if (line.startsWith('event: ')) type = line.slice(7)
    else if (line.startsWith('data: ')) data += line.slice(6)
  }
  return data ? { type, data: JSON.parse(data) } : null
}

// The server's explanation for a refused request (rate limit, too long, not set up), or a fallback.
async function errorMessage(response) {
  try {
    const { detail } = await response.json()
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '')
  } catch {
    // not JSON
  }
  return 'The assistant is unavailable right now. Please try again later.'
}
