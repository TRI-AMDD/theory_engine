import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HypothesisCard } from '../HypothesisCard'
import type { Hypothesis, CausalGraph } from '../../types'

// Sample hypothesis for tests
const mockHypothesis: Hypothesis = {
  id: 'test-hyp-1',
  createdAt: new Date('2025-01-15T10:30:00Z').toISOString(),
  intervenables: ['node-1'],
  observables: ['node-2'],
  desirables: ['node-3'],
  prescription: 'Test prescription text',
  predictions: {
    observables: 'Observable prediction text',
    desirables: 'Desirable prediction text'
  },
  story: 'Test causal story',
  actionHooks: [{
    actionId: 'action-1',
    actionName: 'Test Action',
    parameters: { temp: '300K', time: '10ns' },
    instructions: 'Run the simulation'
  }],
  critique: 'Test critique',
  status: 'active'
}

const mockGraph: CausalGraph = {
  nodes: [
    { id: 'node-1', variableName: 'var1', displayName: 'Node 1', description: '', classification: 'intervenable' },
    { id: 'node-2', variableName: 'var2', displayName: 'Node 2', description: '', classification: 'observable' },
    { id: 'node-3', variableName: 'var3', displayName: 'Node 3', description: '', isDesirable: true }
  ],
  edges: [],
  experimentalContext: 'Test context'
}

const mockNodeNames = ['Node 1', 'Node 2', 'Node 3']

// Default mock handlers
const createMockHandlers = () => ({
  onRefresh: vi.fn(),
  onDelete: vi.fn(),
  onExport: vi.fn(),
  onRefine: vi.fn().mockResolvedValue(undefined),
  onSelect: vi.fn(),
  onDirectEdit: vi.fn()
})

describe('HypothesisCard', () => {
  // ============================================
  // Basic Rendering Tests
  // ============================================
  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const handlers = createMockHandlers()
      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )
      expect(screen.getByText(/Test prescription text/)).toBeInTheDocument()
    })

    it('renders with hypothesis data (prescription and date)', () => {
      const handlers = createMockHandlers()
      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Prescription text should be visible
      expect(screen.getByText(/Test prescription text/)).toBeInTheDocument()

      // Date should be formatted and visible
      // Note: toLocaleString() output varies by locale, so we check for part of the date
      expect(screen.getByText(/2025/)).toBeInTheDocument()
    })

    it('shows expand/collapse chevron', () => {
      const handlers = createMockHandlers()
      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Collapsed state shows right-pointing chevron
      expect(screen.getByText('▶')).toBeInTheDocument()
    })

    it('clicking header expands/collapses content', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()
      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Initially collapsed - should show right chevron
      expect(screen.getByText('▶')).toBeInTheDocument()

      // Click to expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Should now show down chevron
      expect(screen.getByText('▼')).toBeInTheDocument()

      // onSelect should have been called with hypothesis id
      expect(handlers.onSelect).toHaveBeenCalledWith(mockHypothesis.id)

      // Click again to collapse
      await user.click(header)

      // Should show right chevron again
      expect(screen.getByText('▶')).toBeInTheDocument()

      // onSelect should have been called with null
      expect(handlers.onSelect).toHaveBeenCalledWith(null)
    })

    it('shows "Outdated" badge when hypothesis is outdated', () => {
      const handlers = createMockHandlers()
      const outdatedHypothesis = {
        ...mockHypothesis,
        status: 'outdated' as const,
        outdatedReason: 'Graph was modified'
      }

      render(
        <HypothesisCard
          hypothesis={outdatedHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      expect(screen.getByText('Outdated')).toBeInTheDocument()
    })

    it('applies active styling when isActive is true', () => {
      const handlers = createMockHandlers()
      const { container } = render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          isActive={true}
          {...handlers}
        />
      )

      // Check for active styling classes
      const card = container.querySelector('.border-blue-400')
      expect(card).toBeInTheDocument()
    })
  })

  // ============================================
  // Expanded Content Tests
  // ============================================
  describe('expanded content', () => {
    let handlers: ReturnType<typeof createMockHandlers>

    beforeEach(() => {
      handlers = createMockHandlers()
    })

    const expandCard = async () => {
      const user = userEvent.setup()
      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Click to expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)
      return user
    }

    it('shows intervenables, observables, desirables labels', async () => {
      await expandCard()

      expect(screen.getByText('Intervenables:')).toBeInTheDocument()
      expect(screen.getByText('Observables:')).toBeInTheDocument()
      expect(screen.getByText('Desirables:')).toBeInTheDocument()

      // Node names should be displayed
      expect(screen.getByText(/Node 1/)).toBeInTheDocument()
      expect(screen.getByText(/Node 2/)).toBeInTheDocument()
      expect(screen.getByText(/Node 3/)).toBeInTheDocument()
    })

    it('shows predictions (observable and desirable)', async () => {
      await expandCard()

      expect(screen.getByText('Observable Predictions:')).toBeInTheDocument()
      expect(screen.getByText('Desirable Predictions:')).toBeInTheDocument()
      expect(screen.getByText(/Observable prediction text/)).toBeInTheDocument()
      expect(screen.getByText(/Desirable prediction text/)).toBeInTheDocument()
    })

    it('shows causal story', async () => {
      await expandCard()

      expect(screen.getByText('Causal Story:')).toBeInTheDocument()
      expect(screen.getByText(/Test causal story/)).toBeInTheDocument()
    })

    it('shows critique', async () => {
      await expandCard()

      expect(screen.getByText('Critique:')).toBeInTheDocument()
      expect(screen.getByText(/Test critique/)).toBeInTheDocument()
    })

    it('shows action hooks when present', async () => {
      await expandCard()

      expect(screen.getByText('Validation Actions:')).toBeInTheDocument()
      expect(screen.getByText('Test Action')).toBeInTheDocument()

      // Parameters should be displayed
      expect(screen.getByText('temp: 300K')).toBeInTheDocument()
      expect(screen.getByText('time: 10ns')).toBeInTheDocument()

      // Instructions should be displayed
      expect(screen.getByText('Run the simulation')).toBeInTheDocument()
    })

    it('does not show action hooks section when empty', async () => {
      const hypothesisNoActions = {
        ...mockHypothesis,
        actionHooks: []
      }
      const user = userEvent.setup()

      render(
        <HypothesisCard
          hypothesis={hypothesisNoActions}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.queryByText('Validation Actions:')).not.toBeInTheDocument()
    })

    it('shows outdated reason when present', async () => {
      const outdatedHypothesis = {
        ...mockHypothesis,
        status: 'outdated' as const,
        outdatedReason: 'Graph was modified'
      }
      const user = userEvent.setup()

      render(
        <HypothesisCard
          hypothesis={outdatedHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.getByText(/Outdated because:/)).toBeInTheDocument()
      expect(screen.getByText(/Graph was modified/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Inline Editing - Prescription
  // ============================================
  describe('inline editing - prescription', () => {
    it('clicking prescription in expanded mode enables edit mode', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand the card
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Find the editable prescription paragraph (the one with hover:bg-gray-50)
      // In expanded mode, there's a clickable paragraph after the "Prescription:" label
      const prescriptionParagraph = screen.getByTitle('Click to edit')
      await user.click(prescriptionParagraph)

      // Should show textarea
      const textareas = screen.getAllByRole('textbox')
      expect(textareas.length).toBeGreaterThanOrEqual(1)
    })

    it('shows textarea with current text when editing', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand and click prescription
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Find the editable prescription paragraph
      const prescriptionParagraph = screen.getByTitle('Click to edit')
      await user.click(prescriptionParagraph)

      // Textarea should have current value
      const textareas = screen.getAllByRole('textbox')
      const prescriptionTextarea = textareas.find(t => (t as HTMLTextAreaElement).value === 'Test prescription text')
      expect(prescriptionTextarea).toBeInTheDocument()
    })

    it('save button saves changes and calls onDirectEdit', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand and click prescription
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Find the editable prescription paragraph
      const prescriptionParagraph = screen.getByTitle('Click to edit')
      await user.click(prescriptionParagraph)

      // Edit the text - find the prescription textarea
      const textareas = screen.getAllByRole('textbox')
      const prescriptionTextarea = textareas.find(t => (t as HTMLTextAreaElement).value === 'Test prescription text')!
      await user.clear(prescriptionTextarea)
      await user.type(prescriptionTextarea, 'Updated prescription')

      // Click Save
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      // onDirectEdit should have been called
      expect(handlers.onDirectEdit).toHaveBeenCalledWith(
        mockHypothesis.id,
        { prescription: 'Updated prescription' }
      )
    })

    it('cancel button discards changes', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand and click prescription
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Find the editable prescription paragraph
      const prescriptionParagraph = screen.getByTitle('Click to edit')
      await user.click(prescriptionParagraph)

      // Edit the text
      const textareas = screen.getAllByRole('textbox')
      const prescriptionTextarea = textareas.find(t => (t as HTMLTextAreaElement).value === 'Test prescription text')!
      await user.clear(prescriptionTextarea)
      await user.type(prescriptionTextarea, 'Updated prescription')

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // onDirectEdit should NOT have been called
      expect(handlers.onDirectEdit).not.toHaveBeenCalled()

      // Original text should still be displayed (may appear multiple times - header and expanded content)
      const prescriptionElements = screen.getAllByText(/Test prescription text/)
      expect(prescriptionElements.length).toBeGreaterThanOrEqual(1)
    })

    it('does not enable edit mode when onDirectEdit is not provided', async () => {
      const user = userEvent.setup()
      // Create handlers and explicitly omit onDirectEdit
      const { onRefresh, onDelete, onExport, onRefine, onSelect } = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          onRefresh={onRefresh}
          onDelete={onDelete}
          onExport={onExport}
          onRefine={onRefine}
          onSelect={onSelect}
        />
      )

      // Expand the card
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click prescription text
      const prescriptionText = screen.getAllByText(/Test prescription text/)[0]
      await user.click(prescriptionText)

      // Should NOT show textarea
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Inline Editing - Predictions
  // ============================================
  describe('inline editing - predictions', () => {
    it('clicking predictions enables edit mode', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click on observable prediction
      const observablePrediction = screen.getByText(/Observable prediction text/)
      await user.click(observablePrediction)

      // Should show textareas for both predictions
      const textareas = screen.getAllByRole('textbox')
      expect(textareas.length).toBeGreaterThanOrEqual(2)
    })

    it('shows textareas for observable and desirable predictions', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click on observable prediction
      const observablePrediction = screen.getByText(/Observable prediction text/)
      await user.click(observablePrediction)

      // Should have labels for Observable and Desirable
      expect(screen.getByText('Observable:')).toBeInTheDocument()
      expect(screen.getByText('Desirable:')).toBeInTheDocument()

      // Textareas should have current values
      const textareas = screen.getAllByRole('textbox')
      const obsTextarea = textareas.find(ta => (ta as HTMLTextAreaElement).value === 'Observable prediction text')
      const desTextarea = textareas.find(ta => (ta as HTMLTextAreaElement).value === 'Desirable prediction text')
      expect(obsTextarea).toBeInTheDocument()
      expect(desTextarea).toBeInTheDocument()
    })

    it('save updates predictions and calls onDirectEdit', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click on observable prediction
      const observablePrediction = screen.getByText(/Observable prediction text/)
      await user.click(observablePrediction)

      // Edit both textareas
      const textareas = screen.getAllByRole('textbox')
      const obsTextarea = textareas.find(ta => (ta as HTMLTextAreaElement).value === 'Observable prediction text')!
      const desTextarea = textareas.find(ta => (ta as HTMLTextAreaElement).value === 'Desirable prediction text')!

      await user.clear(obsTextarea)
      await user.type(obsTextarea, 'New observable prediction')
      await user.clear(desTextarea)
      await user.type(desTextarea, 'New desirable prediction')

      // Click Save
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      // onDirectEdit should have been called with updated predictions
      expect(handlers.onDirectEdit).toHaveBeenCalledWith(
        mockHypothesis.id,
        {
          predictions: {
            observables: 'New observable prediction',
            desirables: 'New desirable prediction'
          }
        }
      )
    })

    it('cancel discards prediction changes', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click on observable prediction
      const observablePrediction = screen.getByText(/Observable prediction text/)
      await user.click(observablePrediction)

      // Edit a textarea
      const textareas = screen.getAllByRole('textbox')
      const obsTextarea = textareas.find(ta => (ta as HTMLTextAreaElement).value === 'Observable prediction text')!
      await user.clear(obsTextarea)
      await user.type(obsTextarea, 'Changed prediction')

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // onDirectEdit should NOT have been called
      expect(handlers.onDirectEdit).not.toHaveBeenCalled()

      // Original text should still be displayed
      expect(screen.getByText(/Observable prediction text/)).toBeInTheDocument()
    })
  })

  // ============================================
  // Inline Editing - Action Hooks
  // ============================================
  describe('inline editing - action hooks', () => {
    it('edit button appears on action hooks', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Should have an Edit button for action hooks
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    it('clicking Edit shows parameter inputs and instructions textarea', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click Edit button
      const editButton = screen.getByRole('button', { name: 'Edit' })
      await user.click(editButton)

      // Should show parameter inputs
      expect(screen.getByText('temp:')).toBeInTheDocument()
      expect(screen.getByText('time:')).toBeInTheDocument()

      // Find inputs with parameter values
      const inputs = screen.getAllByRole('textbox')
      const tempInput = inputs.find(i => (i as HTMLInputElement).value === '300K')
      const timeInput = inputs.find(i => (i as HTMLInputElement).value === '10ns')
      expect(tempInput).toBeInTheDocument()
      expect(timeInput).toBeInTheDocument()

      // Should show instructions textarea
      expect(screen.getByText('Instructions:')).toBeInTheDocument()
      const instructionsTextarea = inputs.find(i => (i as HTMLTextAreaElement).value === 'Run the simulation')
      expect(instructionsTextarea).toBeInTheDocument()

      // Button should now say "Done"
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })

    it('changes to parameters call onDirectEdit with updated actionHooks', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click Edit button
      const editButton = screen.getByRole('button', { name: 'Edit' })
      await user.click(editButton)

      // Find and edit the temp parameter - type just one character to trigger an update
      const inputs = screen.getAllByRole('textbox')
      const tempInput = inputs.find(i => (i as HTMLInputElement).value === '300K')!
      await user.type(tempInput, '!')

      // onDirectEdit should have been called with updated action hooks
      // The input will have the appended character
      expect(handlers.onDirectEdit).toHaveBeenCalledWith(
        mockHypothesis.id,
        expect.objectContaining({
          actionHooks: expect.arrayContaining([
            expect.objectContaining({
              parameters: expect.objectContaining({ temp: '300K!' })
            })
          ])
        })
      )
    })

    it('changes to instructions call onDirectEdit with updated actionHooks', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click Edit button
      const editButton = screen.getByRole('button', { name: 'Edit' })
      await user.click(editButton)

      // Find and edit the instructions textarea - type just one character
      const textareas = screen.getAllByRole('textbox')
      const instructionsTextarea = textareas.find(t => (t as HTMLTextAreaElement).value === 'Run the simulation')!
      await user.type(instructionsTextarea, '!')

      // onDirectEdit should have been called with updated action hooks
      expect(handlers.onDirectEdit).toHaveBeenCalledWith(
        mockHypothesis.id,
        expect.objectContaining({
          actionHooks: expect.arrayContaining([
            expect.objectContaining({
              instructions: 'Run the simulation!'
            })
          ])
        })
      )
    })

    it('clicking Done closes the edit mode', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click Edit button
      const editButton = screen.getByRole('button', { name: 'Edit' })
      await user.click(editButton)

      // Click Done button
      const doneButton = screen.getByRole('button', { name: 'Done' })
      await user.click(doneButton)

      // Should show Edit button again
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })

    it('does not show Edit button when onDirectEdit is not provided', async () => {
      const user = userEvent.setup()
      // Create handlers and explicitly omit onDirectEdit
      const { onRefresh, onDelete, onExport, onRefine, onSelect } = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          onRefresh={onRefresh}
          onDelete={onDelete}
          onExport={onExport}
          onRefine={onRefine}
          onSelect={onSelect}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Should NOT have an Edit button for action hooks
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // LLM Refinement
  // ============================================
  describe('LLM refinement', () => {
    it('shows feedback input in expanded view', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Should show feedback input
      expect(screen.getByText(/Ask a question or suggest changes/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/What if we increase/)).toBeInTheDocument()
    })

    it('shows Refine button in expanded view', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.getByRole('button', { name: 'Refine' })).toBeInTheDocument()
    })

    it('Refine button calls onRefine with feedback', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Type feedback
      const feedbackInput = screen.getByPlaceholderText(/What if we increase/)
      await user.type(feedbackInput, 'Increase the temperature')

      // Click Refine
      const refineButton = screen.getByRole('button', { name: 'Refine' })
      await user.click(refineButton)

      // onRefine should have been called
      expect(handlers.onRefine).toHaveBeenCalledWith(mockHypothesis.id, 'Increase the temperature')
    })

    it('Refine button is disabled when feedback is empty', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Refine button should be disabled
      const refineButton = screen.getByRole('button', { name: 'Refine' })
      expect(refineButton).toBeDisabled()
    })

    it('clears feedback input after successful refine', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Type feedback
      const feedbackInput = screen.getByPlaceholderText(/What if we increase/)
      await user.type(feedbackInput, 'Increase the temperature')

      // Click Refine
      const refineButton = screen.getByRole('button', { name: 'Refine' })
      await user.click(refineButton)

      // Wait for the refine to complete
      await vi.waitFor(() => {
        expect(feedbackInput).toHaveValue('')
      })
    })

    it('shows loading state while refining', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()
      // Make onRefine take some time
      handlers.onRefine.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Type feedback
      const feedbackInput = screen.getByPlaceholderText(/What if we increase/)
      await user.type(feedbackInput, 'Increase the temperature')

      // Click Refine
      const refineButton = screen.getByRole('button', { name: 'Refine' })
      await user.click(refineButton)

      // Should show loading state
      expect(screen.getByText('...')).toBeInTheDocument()

      // Wait for completion
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refine' })).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // Action Buttons
  // ============================================
  describe('action buttons', () => {
    it('shows Export Instructions button in expanded view', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.getByRole('button', { name: 'Export Instructions' })).toBeInTheDocument()
    })

    it('Export Instructions calls onExport', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      const exportButton = screen.getByRole('button', { name: 'Export Instructions' })
      await user.click(exportButton)

      expect(handlers.onExport).toHaveBeenCalledWith(mockHypothesis)
    })

    it('shows Delete button in expanded view', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('Delete calls onDelete', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      const deleteButton = screen.getByRole('button', { name: 'Delete' })
      await user.click(deleteButton)

      expect(handlers.onDelete).toHaveBeenCalledWith(mockHypothesis.id)
    })

    it('shows Refresh button when hypothesis is outdated', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()
      const outdatedHypothesis = {
        ...mockHypothesis,
        status: 'outdated' as const
      }

      render(
        <HypothesisCard
          hypothesis={outdatedHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    })

    it('Refresh calls onRefresh', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()
      const outdatedHypothesis = {
        ...mockHypothesis,
        status: 'outdated' as const
      }

      render(
        <HypothesisCard
          hypothesis={outdatedHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      await user.click(refreshButton)

      expect(handlers.onRefresh).toHaveBeenCalledWith(mockHypothesis.id)
    })

    it('does not show Refresh button when hypothesis is active', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument()
    })
  })

  // ============================================
  // Integration Tests
  // ============================================
  describe('full workflow integration', () => {
    it('can expand, edit prescription, and save', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click prescription to edit (find the editable paragraph)
      const prescriptionParagraph = screen.getByTitle('Click to edit')
      await user.click(prescriptionParagraph)

      // Edit
      const textareas = screen.getAllByRole('textbox')
      const prescriptionTextarea = textareas.find(t => (t as HTMLTextAreaElement).value === 'Test prescription text')!
      await user.clear(prescriptionTextarea)
      await user.type(prescriptionTextarea, 'New prescription')

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save' })
      await user.click(saveButton)

      // Verify callback
      expect(handlers.onDirectEdit).toHaveBeenCalledWith(
        mockHypothesis.id,
        { prescription: 'New prescription' }
      )
    })

    it('can expand, edit action hook, and close edit mode', async () => {
      const user = userEvent.setup()
      const handlers = createMockHandlers()

      render(
        <HypothesisCard
          hypothesis={mockHypothesis}
          graph={mockGraph}
          nodeNames={mockNodeNames}
          {...handlers}
        />
      )

      // Expand
      const header = screen.getByText(/Test prescription text/).closest('div.cursor-pointer')!
      await user.click(header)

      // Click Edit on action hook
      const editButton = screen.getByRole('button', { name: 'Edit' })
      await user.click(editButton)

      // Edit a parameter - just append a character
      const inputs = screen.getAllByRole('textbox')
      const tempInput = inputs.find(i => (i as HTMLInputElement).value === '300K')!
      await user.type(tempInput, '!')

      // Verify callback was made
      expect(handlers.onDirectEdit).toHaveBeenCalled()

      // Close edit mode
      const doneButton = screen.getByRole('button', { name: 'Done' })
      await user.click(doneButton)

      // Edit button should be visible again
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    })
  })
})
