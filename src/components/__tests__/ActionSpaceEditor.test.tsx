import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActionSpaceEditor } from '../ActionSpaceEditor'

describe('ActionSpaceEditor', () => {
  it('renders without crashing', () => {
    const mockOnUpdate = vi.fn()
    render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)
    expect(screen.getByText('Action Space')).toBeInTheDocument()
  })

  it('shows empty state message when no actions', () => {
    const mockOnUpdate = vi.fn()
    render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)
    expect(screen.getByText(/No actions defined/i)).toBeInTheDocument()
  })

  it('shows Load Preset button', () => {
    const mockOnUpdate = vi.fn()
    render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)
    expect(screen.getByText(/Load Preset/i)).toBeInTheDocument()
  })
})
