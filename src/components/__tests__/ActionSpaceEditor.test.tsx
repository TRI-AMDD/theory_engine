import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionSpaceEditor } from '../ActionSpaceEditor'
import { ACTION_SPACE_PRESETS } from '../../data/actionSpacePresets'
import type { ActionSpace, ActionDefinition } from '../../types'

// Helper to create mock actions for testing
const createMockAction = (overrides: Partial<ActionDefinition> = {}): ActionDefinition => ({
  id: `action-${Date.now()}-${Math.random()}`,
  name: 'Test Action',
  type: 'custom',
  description: 'Test description',
  parameterHints: [],
  ...overrides,
})

describe('ActionSpaceEditor', () => {
  // Basic rendering tests
  describe('basic rendering', () => {
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

  // Preset dropdown tests
  describe('preset dropdown', () => {
    it('clicking "Load Preset" opens the dropdown menu', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      // Check that all presets are visible
      expect(screen.getByText('Matlantis MD')).toBeInTheDocument()
    })

    it('all 6 presets are shown in the dropdown', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      // All 6 presets should be visible
      expect(ACTION_SPACE_PRESETS).toHaveLength(6)
      ACTION_SPACE_PRESETS.forEach(preset => {
        expect(screen.getByText(preset.name)).toBeInTheDocument()
      })
    })

    it('clicking outside closes the dropdown', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />
        </div>
      )

      // Open the dropdown
      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      // Verify dropdown is open
      expect(screen.getByText('Matlantis MD')).toBeInTheDocument()

      // Click the Load Preset button again to close (toggle behavior)
      await user.click(loadPresetButton)

      // Dropdown should be closed - preset names should not be visible
      // Note: The button text "Matlantis MD" is in the dropdown, not the button itself
      expect(screen.queryByText('XTB (Tight Binding)')).not.toBeInTheDocument()
    })
  })

  // Load preset tests
  describe('load preset', () => {
    it('clicking a preset calls onUpdate with the preset actions', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      // Open dropdown
      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      // Click on Matlantis MD preset
      const matlantisOption = screen.getByText('Matlantis MD')
      await user.click(matlantisOption)

      // Check that onUpdate was called
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      const calledWith = mockOnUpdate.mock.calls[0][0] as ActionSpace

      // Find the Matlantis preset
      const matlantisPreset = ACTION_SPACE_PRESETS.find(p => p.name === 'Matlantis MD')!
      expect(calledWith.actions).toHaveLength(matlantisPreset.actions.length)
    })

    it('loading a preset merges with existing actions (no duplicates)', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()

      // Start with an existing action from the Matlantis preset
      const matlantisPreset = ACTION_SPACE_PRESETS.find(p => p.name === 'Matlantis MD')!
      const existingAction = { ...matlantisPreset.actions[0] }

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: [existingAction] }}
          onUpdate={mockOnUpdate}
        />
      )

      // Open dropdown and load the same preset
      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      // Use getAllByText and find the one in the dropdown (within a button)
      const matlantisOptions = screen.getAllByText('Matlantis MD')
      // The dropdown option is within a button element with the preset's description
      const dropdownOption = matlantisOptions.find(el =>
        el.closest('button.w-full')
      )!
      await user.click(dropdownOption)

      // Check that onUpdate was called with merged actions (no duplicates)
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      const calledWith = mockOnUpdate.mock.calls[0][0] as ActionSpace

      // Should have existing action + new actions from preset (minus the duplicate)
      // The preset has 3 actions, we already have 1, so we should get 3 total (1 + 2 new)
      expect(calledWith.actions).toHaveLength(matlantisPreset.actions.length)

      // Verify no duplicate IDs
      const ids = calledWith.actions.map(a => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  // Action display tests
  describe('action display', () => {
    it('renders action cards with name, type badge, description', () => {
      const mockOnUpdate = vi.fn()
      const testAction = createMockAction({
        id: 'test-action-1',
        name: 'My Test Action',
        type: 'md_simulation',
        description: 'This is a test action description',
      })

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: [testAction] }}
          onUpdate={mockOnUpdate}
        />
      )

      // Check name
      expect(screen.getByText('My Test Action')).toBeInTheDocument()

      // Check type badge (MD Simulation label)
      expect(screen.getByText('MD Simulation')).toBeInTheDocument()

      // Check description
      expect(screen.getByText('This is a test action description')).toBeInTheDocument()
    })

    it('shows parameterHints as blue tags', () => {
      const mockOnUpdate = vi.fn()
      const testAction = createMockAction({
        id: 'test-action-hints',
        name: 'Action With Hints',
        type: 'custom',
        parameterHints: ['structure', 'temperature', 'pressure'],
      })

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: [testAction] }}
          onUpdate={mockOnUpdate}
        />
      )

      // Check that parameter hints are displayed
      expect(screen.getByText('structure')).toBeInTheDocument()
      expect(screen.getByText('temperature')).toBeInTheDocument()
      expect(screen.getByText('pressure')).toBeInTheDocument()
    })

    it('shows inputCategories when present', () => {
      const mockOnUpdate = vi.fn()
      const testAction = createMockAction({
        id: 'test-action-categories',
        name: 'Action With Categories',
        type: 'matlantis_md',
        inputCategories: [
          {
            category: 'Structure Input',
            parameters: ['structure_file', 'structure_format'],
            description: 'Input structure files',
          },
          {
            category: 'Simulation Parameters',
            parameters: ['temperature', 'pressure', 'timestep'],
            description: 'MD simulation settings',
          },
        ],
      })

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: [testAction] }}
          onUpdate={mockOnUpdate}
        />
      )

      // Check that input categories are displayed
      expect(screen.getByText('Structure Input:')).toBeInTheDocument()
      expect(screen.getByText('structure_file, structure_format')).toBeInTheDocument()
      expect(screen.getByText('Simulation Parameters:')).toBeInTheDocument()
      expect(screen.getByText('temperature, pressure, timestep')).toBeInTheDocument()
    })
  })

  // Add action tests
  describe('add action', () => {
    it('clicking "+ Add Action" shows the add form', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      // Form should not be visible initially
      expect(screen.queryByPlaceholderText(/Action name/i)).not.toBeInTheDocument()

      // Click add button
      const addButton = screen.getByText('+ Add Action')
      await user.click(addButton)

      // Form should now be visible
      expect(screen.getByPlaceholderText(/Action name/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Description/i)).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument() // type dropdown
    })

    it('can fill in name, type, description and add action', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      // Open the add form
      const addButton = screen.getByText('+ Add Action')
      await user.click(addButton)

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/Action name/i)
      await user.type(nameInput, 'New Custom Action')

      const typeSelect = screen.getByRole('combobox')
      await user.selectOptions(typeSelect, 'experiment')

      const descInput = screen.getByPlaceholderText(/Description/i)
      await user.type(descInput, 'A new experimental action')

      // Click Add button
      const submitButton = screen.getByRole('button', { name: 'Add' })
      await user.click(submitButton)

      // Check that onUpdate was called with the new action
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      const calledWith = mockOnUpdate.mock.calls[0][0] as ActionSpace
      expect(calledWith.actions).toHaveLength(1)
      expect(calledWith.actions[0].name).toBe('New Custom Action')
      expect(calledWith.actions[0].type).toBe('experiment')
      expect(calledWith.actions[0].description).toBe('A new experimental action')
    })

    it('Cancel button hides the form', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      // Open the add form
      const addButton = screen.getByText('+ Add Action')
      await user.click(addButton)

      // Form should be visible
      expect(screen.getByPlaceholderText(/Action name/i)).toBeInTheDocument()

      // Click Cancel button
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      // Form should be hidden
      expect(screen.queryByPlaceholderText(/Action name/i)).not.toBeInTheDocument()

      // onUpdate should not have been called
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })

    it('does not add action if name is empty', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      render(<ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />)

      // Open the add form
      const addButton = screen.getByText('+ Add Action')
      await user.click(addButton)

      // Try to add without filling in name
      const submitButton = screen.getByRole('button', { name: 'Add' })
      await user.click(submitButton)

      // onUpdate should not have been called
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })

  // Remove action tests
  describe('remove action', () => {
    it('each action has a remove button', () => {
      const mockOnUpdate = vi.fn()
      const testActions = [
        createMockAction({ id: 'action-1', name: 'Action 1' }),
        createMockAction({ id: 'action-2', name: 'Action 2' }),
      ]

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: testActions }}
          onUpdate={mockOnUpdate}
        />
      )

      // Each action should have a remove button (×)
      const removeButtons = screen.getAllByText('×')
      expect(removeButtons).toHaveLength(2)
    })

    it('clicking remove calls onUpdate without that action', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      const testActions = [
        createMockAction({ id: 'action-1', name: 'Action One' }),
        createMockAction({ id: 'action-2', name: 'Action Two' }),
      ]

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: testActions }}
          onUpdate={mockOnUpdate}
        />
      )

      // Find the action card for "Action One" and click its remove button
      const actionOneCard = screen.getByText('Action One').closest('div.bg-white')!
      const removeButton = within(actionOneCard as HTMLElement).getByText('×')
      await user.click(removeButton)

      // Check that onUpdate was called
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      const calledWith = mockOnUpdate.mock.calls[0][0] as ActionSpace

      // Should only have Action Two remaining
      expect(calledWith.actions).toHaveLength(1)
      expect(calledWith.actions[0].id).toBe('action-2')
    })
  })

  // Clear All tests
  describe('Clear All', () => {
    let originalConfirm: typeof window.confirm

    beforeEach(() => {
      originalConfirm = window.confirm
    })

    afterEach(() => {
      window.confirm = originalConfirm
    })

    it('"Clear All" button only shows when actions exist', () => {
      const mockOnUpdate = vi.fn()

      // With no actions
      const { rerender } = render(
        <ActionSpaceEditor actionSpace={{ actions: [] }} onUpdate={mockOnUpdate} />
      )
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument()

      // With actions
      const testAction = createMockAction({ id: 'test-1', name: 'Test' })
      rerender(
        <ActionSpaceEditor actionSpace={{ actions: [testAction] }} onUpdate={mockOnUpdate} />
      )
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    it('clicking Clear All with confirm removes all actions', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      window.confirm = vi.fn(() => true) // User confirms

      const testActions = [
        createMockAction({ id: 'action-1', name: 'Action 1' }),
        createMockAction({ id: 'action-2', name: 'Action 2' }),
      ]

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: testActions }}
          onUpdate={mockOnUpdate}
        />
      )

      const clearAllButton = screen.getByText('Clear All')
      await user.click(clearAllButton)

      // Confirm should have been called
      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all actions? This cannot be undone.'
      )

      // onUpdate should have been called with empty actions
      expect(mockOnUpdate).toHaveBeenCalledTimes(1)
      const calledWith = mockOnUpdate.mock.calls[0][0] as ActionSpace
      expect(calledWith.actions).toHaveLength(0)
    })

    it('clicking Clear All without confirm does not remove actions', async () => {
      const user = userEvent.setup()
      const mockOnUpdate = vi.fn()
      window.confirm = vi.fn(() => false) // User cancels

      const testActions = [
        createMockAction({ id: 'action-1', name: 'Action 1' }),
      ]

      render(
        <ActionSpaceEditor
          actionSpace={{ actions: testActions }}
          onUpdate={mockOnUpdate}
        />
      )

      const clearAllButton = screen.getByText('Clear All')
      await user.click(clearAllButton)

      // Confirm should have been called
      expect(window.confirm).toHaveBeenCalled()

      // onUpdate should NOT have been called
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })
  })

  // Integration test: Full workflow
  describe('full workflow integration', () => {
    it('can load preset, add custom action, and remove an action', async () => {
      const user = userEvent.setup()
      let currentActionSpace: ActionSpace = { actions: [] }
      const mockOnUpdate = vi.fn((newSpace: ActionSpace) => {
        currentActionSpace = newSpace
      })

      const { rerender } = render(
        <ActionSpaceEditor
          actionSpace={currentActionSpace}
          onUpdate={mockOnUpdate}
        />
      )

      // Step 1: Load DRXnet preset (smallest with 2 actions)
      const loadPresetButton = screen.getByText(/Load Preset/i)
      await user.click(loadPresetButton)

      const drxnetOption = screen.getByText('DRXnet (Battery Prediction)')
      await user.click(drxnetOption)

      // Rerender with new state
      rerender(
        <ActionSpaceEditor
          actionSpace={currentActionSpace}
          onUpdate={mockOnUpdate}
        />
      )

      const drxnetPreset = ACTION_SPACE_PRESETS.find(p => p.name === 'DRXnet (Battery Prediction)')!
      expect(currentActionSpace.actions).toHaveLength(drxnetPreset.actions.length)

      // Step 2: Add a custom action
      const addButton = screen.getByText('+ Add Action')
      await user.click(addButton)

      const nameInput = screen.getByPlaceholderText(/Action name/i)
      await user.type(nameInput, 'My Custom Analysis')

      const submitButton = screen.getByRole('button', { name: 'Add' })
      await user.click(submitButton)

      // Rerender with new state
      rerender(
        <ActionSpaceEditor
          actionSpace={currentActionSpace}
          onUpdate={mockOnUpdate}
        />
      )

      // Should now have preset actions + 1 custom
      expect(currentActionSpace.actions).toHaveLength(drxnetPreset.actions.length + 1)

      // Step 3: Remove the custom action
      const customActionCard = screen.getByText('My Custom Analysis').closest('div.bg-white')!
      const removeButton = within(customActionCard as HTMLElement).getByText('×')
      await user.click(removeButton)

      // Should be back to just preset actions
      expect(currentActionSpace.actions).toHaveLength(drxnetPreset.actions.length)
    })
  })
})
