// Renders an assistant answer: paragraphs, "- " and "1." lists and **bold**. Citation numbers like [1] are
// removed (readers don't see sources). Builds React elements from the text (never HTML), so nothing in an
// answer can inject markup.

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const BOLD = /\*\*(.+?)\*\*/g
// Citation numbers like " [1]" or "[2][3]", in case the model writes one anyway.
const CITATIONS = /[ \t]*(?:\[\d+\])+/g

// Groups lines into paragraphs and lists. Blank lines end a paragraph; a list can start right after a line
// like "A few things to avoid:".
function toBlocks(text) {
  const blocks = []
  let current = null
  for (const line of text.split('\n')) {
    const bullet = line.match(BULLET)
    const numbered = !bullet && line.match(NUMBERED)
    const item = bullet || numbered
    if (item) {
      const type = bullet ? 'ul' : 'ol'
      if (current?.type !== type) blocks.push((current = { type, lines: [] }))
      current.lines.push(item[1])
    } else if (line.trim() === '') {
      current = null
    } else {
      if (current?.type !== 'p') blocks.push((current = { type: 'p', lines: [] }))
      current.lines.push(line)
    }
  }
  return blocks
}

function Inline({ text }) {
  const parts = []
  let last = 0
  for (const match of text.matchAll(BOLD)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <strong key={match.index} className="font-semibold">
        {match[1]}
      </strong>,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function ChatAnswer({ text }) {
  return (
    <div className="space-y-2 leading-relaxed">
      {toBlocks(text.replace(CITATIONS, '')).map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i} className="whitespace-pre-line">
              <Inline text={block.lines.join('\n')} />
            </p>
          )
        }
        const List = block.type
        return (
          <List key={i} className={`space-y-1 pl-5 ${List === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-copper`}>
            {block.lines.map((line, j) => (
              <li key={j}>
                <Inline text={line} />
              </li>
            ))}
          </List>
        )
      })}
    </div>
  )
}

export default ChatAnswer
