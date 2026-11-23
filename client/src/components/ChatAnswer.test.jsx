import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ChatAnswer from './ChatAnswer'

describe('ChatAnswer', () => {
  it('turns "- " and numbered lines into lists, even right after a sentence', () => {
    render(<ChatAnswer text={'A few things to avoid:\n- Steam mops.\n- Vinegar.\n\nSteps:\n1. Sweep.\n2. Mop.'} />)
    const [bullets, steps] = screen.getAllByRole('list')
    expect(bullets.tagName).toBe('UL')
    expect(bullets.querySelectorAll('li')).toHaveLength(2)
    expect(steps.tagName).toBe('OL')
    expect(steps).toHaveTextContent('Sweep.Mop.')
    expect(screen.getByText('A few things to avoid:')).toBeInTheDocument()
  })

  it('shows **bold** as bold and removes citation numbers', () => {
    render(<ChatAnswer text={'Use a **damp** mop [1][2].\n- Sweep often [3].'} />)
    expect(screen.getByText('damp').tagName).toBe('STRONG')
    expect(screen.getByText(/mop\.$/)).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent(/^Sweep often\.$/)
    expect(screen.queryByText(/\[\d\]/)).not.toBeInTheDocument()
  })

  it('never renders markup from the answer', () => {
    const { container } = render(<ChatAnswer text={'<img src=x onerror=alert(1)> hi'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)> hi')
  })
})
