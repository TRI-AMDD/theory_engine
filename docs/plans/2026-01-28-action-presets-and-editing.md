# Action Space Presets & Hypothesis Editing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pre-loaded action space presets (Matlantis MD, XTB, Crystal DB, DRXnet, Query Data) and enable inline + LLM-assisted editing of hypotheses and actions.

**Architecture:** Extend the existing `ActionSpace` type with preset definitions in a new data file. Add action type enum extensions for new tools. Enhance HypothesisCard and ActionDetailPanel with direct field editing plus LLM refinement API calls.

**Tech Stack:** React 19, TypeScript, Azure OpenAI, Tailwind CSS

---

## Phase 1: Action Space Presets

### Task 1: Extend ActionDefinition Types

**Files:**
- Modify: `src/types/index.ts:107-117`

**Step 1: Read the current types**
Review the existing `ActionDefinition` and `ActionSpace` types.

**Step 2: Add new action types**

```typescript
// In src/types/index.ts, update ActionDefinition.type
export interface ActionDefinition {
  id: string;
  name: string;
  type: 'md_simulation' | 'experiment' | 'literature' | 'dataset' | 'custom' |
        'matlantis_md' | 'xtb_calculation' | 'crystal_structure_query' | 'drxnet_prediction';
  description: string;
  parameterHints?: string[];
  // NEW: structured input categories
  inputCategories?: {
    category: string;
    parameters: string[];
    description: string;
  }[];
}

// NEW: Preset action space definition
export interface ActionSpacePreset {
  id: string;
  name: string;
  description: string;
  actions: ActionDefinition[];
}
```

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add new action types and preset interface

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Action Space Presets Data File

**Files:**
- Create: `src/data/actionSpacePresets.ts`

**Step 1: Create the presets file with all action space definitions**

```typescript
// src/data/actionSpacePresets.ts
import type { ActionSpacePreset, ActionDefinition } from '../types';

// ============================================
// MATLANTIS MD PRESET
// ============================================
const matlantisActions: ActionDefinition[] = [
  {
    id: 'matlantis-md-run',
    name: 'Matlantis MD Run',
    type: 'matlantis_md',
    description: 'Run molecular dynamics simulation using Matlantis universal ML potential',
    parameterHints: ['structure', 'temperature', 'simulation_time', 'ensemble', 'pressure'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id', 'structure_modifications'],
        description: 'Crystal structure from DB or file, with optional modifications'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['temperature', 'pressure', 'timestep', 'simulation_time', 'ensemble'],
        description: 'MD thermodynamic and temporal settings'
      },
      {
        category: 'Output Settings',
        parameters: ['trajectory_interval', 'property_output', 'restart_frequency'],
        description: 'What to save and how often'
      }
    ]
  },
  {
    id: 'matlantis-relax',
    name: 'Matlantis Structure Relaxation',
    type: 'matlantis_md',
    description: 'Geometry optimization using Matlantis ML potential',
    parameterHints: ['structure', 'fmax', 'max_steps', 'optimizer'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id'],
        description: 'Structure to relax'
      },
      {
        category: 'Optimization Settings',
        parameters: ['fmax', 'max_steps', 'optimizer', 'cell_relax'],
        description: 'Convergence criteria and method'
      }
    ]
  },
  {
    id: 'matlantis-neb',
    name: 'Matlantis NEB Calculation',
    type: 'matlantis_md',
    description: 'Nudged elastic band for transition state search',
    parameterHints: ['initial_structure', 'final_structure', 'n_images', 'fmax'],
    inputCategories: [
      {
        category: 'Endpoint Structures',
        parameters: ['initial_structure', 'final_structure'],
        description: 'Initial and final states'
      },
      {
        category: 'NEB Settings',
        parameters: ['n_images', 'fmax', 'climb', 'spring_constant'],
        description: 'Number of images and convergence'
      }
    ]
  }
];

// ============================================
// XTB PRESET (Tight Binding)
// ============================================
const xtbActions: ActionDefinition[] = [
  {
    id: 'xtb-singlepoint',
    name: 'XTB Single Point',
    type: 'xtb_calculation',
    description: 'Single point energy and properties using GFN-xTB',
    parameterHints: ['structure', 'method', 'charge', 'multiplicity'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_format'],
        description: 'XYZ, SDF, or other molecular format'
      },
      {
        category: 'Method Settings',
        parameters: ['method', 'charge', 'multiplicity', 'solvent'],
        description: 'GFN0-xTB, GFN1-xTB, GFN2-xTB, or GFN-FF'
      }
    ]
  },
  {
    id: 'xtb-optimize',
    name: 'XTB Geometry Optimization',
    type: 'xtb_calculation',
    description: 'Optimize molecular geometry using GFN-xTB',
    parameterHints: ['structure', 'method', 'opt_level', 'charge'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_format'],
        description: 'Starting structure'
      },
      {
        category: 'Optimization Settings',
        parameters: ['method', 'opt_level', 'max_cycles', 'charge', 'multiplicity'],
        description: 'crude/sloppy/loose/normal/tight/vtight'
      }
    ]
  },
  {
    id: 'xtb-md',
    name: 'XTB Molecular Dynamics',
    type: 'xtb_calculation',
    description: 'Semi-empirical MD using GFN-xTB',
    parameterHints: ['structure', 'temperature', 'time', 'method'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source'],
        description: 'Starting geometry'
      },
      {
        category: 'MD Settings',
        parameters: ['temperature', 'time', 'dump', 'step', 'shake'],
        description: 'Simulation parameters'
      }
    ]
  },
  {
    id: 'xtb-scan',
    name: 'XTB Coordinate Scan',
    type: 'xtb_calculation',
    description: 'Scan along reaction coordinate',
    parameterHints: ['structure', 'constraint', 'scan_range', 'steps'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source'],
        description: 'Starting geometry'
      },
      {
        category: 'Scan Settings',
        parameters: ['constraint_type', 'atom_indices', 'start_value', 'end_value', 'steps'],
        description: 'Distance, angle, or dihedral scan'
      }
    ]
  }
];

// ============================================
// UNIVERSAL CRYSTAL STRUCTURE DATABASE PRESET
// ============================================
const crystalDbActions: ActionDefinition[] = [
  {
    id: 'crystal-db-query',
    name: 'Crystal Structure Query',
    type: 'crystal_structure_query',
    description: 'Query crystal structures by composition, ID, or properties',
    parameterHints: ['query_type', 'query_value', 'database'],
    inputCategories: [
      {
        category: 'Query Type',
        parameters: ['query_type'],
        description: 'composition | mp_id | icsd_id | oqmd_id | aflow_id | cod_id | prototype'
      },
      {
        category: 'Query Value',
        parameters: ['formula', 'elements', 'material_id', 'property_filter'],
        description: 'Search criteria (e.g., "LiMnO2", "mp-12345", elements=["Li","Mn","O"])'
      },
      {
        category: 'Database Selection',
        parameters: ['database', 'api_key_env'],
        description: 'mp | icsd | oqmd | aflow | cod | gnome | alexandria'
      }
    ]
  },
  {
    id: 'crystal-modify-supercell',
    name: 'Create Supercell',
    type: 'crystal_structure_query',
    description: 'Expand unit cell to supercell',
    parameterHints: ['structure', 'supercell_matrix'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id'],
        description: 'Base structure'
      },
      {
        category: 'Supercell Settings',
        parameters: ['scaling_matrix', 'primitive_first'],
        description: '2x2x2, 3x3x3, or custom [[a,b,c],[d,e,f],[g,h,i]]'
      }
    ]
  },
  {
    id: 'crystal-modify-defect',
    name: 'Create Point Defect',
    type: 'crystal_structure_query',
    description: 'Introduce vacancy, substitution, or interstitial defect',
    parameterHints: ['structure', 'defect_type', 'site', 'species'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id', 'supercell_size'],
        description: 'Base structure (recommend supercell first)'
      },
      {
        category: 'Defect Settings',
        parameters: ['defect_type', 'site_index', 'target_species', 'charge_state'],
        description: 'vacancy | substitution | interstitial'
      }
    ]
  },
  {
    id: 'crystal-modify-surface',
    name: 'Create Surface Slab',
    type: 'crystal_structure_query',
    description: 'Generate surface slab with Miller indices',
    parameterHints: ['structure', 'miller_index', 'thickness', 'vacuum'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id'],
        description: 'Bulk structure'
      },
      {
        category: 'Surface Settings',
        parameters: ['miller_index', 'min_slab_size', 'min_vacuum_size', 'termination'],
        description: 'e.g., [1,1,0], 10 Angstrom slab, 15 Angstrom vacuum'
      }
    ]
  },
  {
    id: 'crystal-modify-strain',
    name: 'Apply Strain',
    type: 'crystal_structure_query',
    description: 'Apply uniaxial, biaxial, or volumetric strain',
    parameterHints: ['structure', 'strain_type', 'strain_magnitude'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_source', 'structure_id'],
        description: 'Base structure'
      },
      {
        category: 'Strain Settings',
        parameters: ['strain_type', 'direction', 'magnitude'],
        description: 'uniaxial | biaxial | hydrostatic, [100]/[110]/[111], -5% to +5%'
      }
    ]
  }
];

// ============================================
// DRXNET PRESET (Battery Voltage Prediction)
// ============================================
const drxnetActions: ActionDefinition[] = [
  {
    id: 'drxnet-voltage-profile',
    name: 'DRXnet Voltage Profile',
    type: 'drxnet_prediction',
    description: 'Predict discharge voltage profile for DRX cathode composition',
    parameterHints: ['composition', 'current_density_rate', 'voltage_window', 'cycle_number'],
    inputCategories: [
      {
        category: 'Composition Input',
        parameters: ['composition'],
        description: 'Chemical formula like "Li1.2Mn0.4Ti0.4O2.0" with Li + redox TM + charge-compensating TM + O/F'
      },
      {
        category: 'Electrochemical Conditions',
        parameters: ['current_density_rate', 'voltage_low', 'voltage_high', 'cycle_number'],
        description: 'Rate: 5-20000 mA/g, Voltage: 1.0-5.0 V, Cycle: 1-891'
      }
    ]
  },
  {
    id: 'drxnet-capacity-screening',
    name: 'DRXnet Capacity Screening',
    type: 'drxnet_prediction',
    description: 'Screen multiple compositions for discharge capacity',
    parameterHints: ['compositions', 'current_density_rate', 'voltage_window'],
    inputCategories: [
      {
        category: 'Composition List',
        parameters: ['compositions'],
        description: 'Array of compositions to screen'
      },
      {
        category: 'Standard Conditions',
        parameters: ['current_density_rate', 'voltage_low', 'voltage_high', 'cycle_number'],
        description: 'Common test conditions for fair comparison'
      }
    ]
  }
];

// ============================================
// QUERY DATA PRESET (Empty template)
// ============================================
const queryDataActions: ActionDefinition[] = [
  {
    id: 'query-data-sql',
    name: 'SQL Database Query',
    type: 'dataset',
    description: 'Query structured data from SQL database',
    parameterHints: ['database', 'query', 'parameters'],
    inputCategories: [
      {
        category: 'Connection',
        parameters: ['database_url', 'credentials_env'],
        description: 'Database connection details'
      },
      {
        category: 'Query',
        parameters: ['sql_query', 'parameters'],
        description: 'Parameterized SQL query'
      }
    ]
  },
  {
    id: 'query-data-api',
    name: 'REST API Query',
    type: 'dataset',
    description: 'Query data from REST API endpoint',
    parameterHints: ['endpoint', 'method', 'headers', 'body'],
    inputCategories: [
      {
        category: 'Endpoint',
        parameters: ['base_url', 'path', 'api_key_env'],
        description: 'API endpoint details'
      },
      {
        category: 'Request',
        parameters: ['method', 'query_params', 'body'],
        description: 'GET/POST and parameters'
      }
    ]
  }
];

// ============================================
// GENERIC MD PRESET (Current default, enhanced)
// ============================================
const genericMdActions: ActionDefinition[] = [
  {
    id: 'generic-md-run',
    name: 'MD Simulation',
    type: 'md_simulation',
    description: 'Generic molecular dynamics simulation',
    parameterHints: ['structure', 'temperature', 'simulation_time', 'ensemble', 'force_field'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure', 'structure_modifications'],
        description: 'DB reference (MP:mp-149) + modifications (supercell, defect, etc.)'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['temperature', 'pressure', 'timestep', 'simulation_time', 'ensemble'],
        description: 'Thermodynamic conditions and duration'
      },
      {
        category: 'Force Field',
        parameters: ['force_field', 'potential_file'],
        description: 'ReaxFF, EAM, MEAM, Tersoff, ML potential, or xc_functional for AIMD'
      }
    ]
  }
];

// ============================================
// EXPORT ALL PRESETS
// ============================================

export const ACTION_SPACE_PRESETS: ActionSpacePreset[] = [
  {
    id: 'preset-matlantis',
    name: 'Matlantis MD',
    description: 'Molecular dynamics and optimization using Matlantis universal ML potential',
    actions: matlantisActions
  },
  {
    id: 'preset-xtb',
    name: 'XTB (Tight Binding)',
    description: 'Semi-empirical GFN-xTB calculations for molecules and clusters',
    actions: xtbActions
  },
  {
    id: 'preset-crystal-db',
    name: 'Crystal Structure Database',
    description: 'Query and modify crystal structures from Materials Project, ICSD, OQMD, AFLOW, COD, GNoME, Alexandria',
    actions: crystalDbActions
  },
  {
    id: 'preset-drxnet',
    name: 'DRXnet (Battery Prediction)',
    description: 'Predict discharge voltage profiles for disordered rocksalt (DRX) cathode materials',
    actions: drxnetActions
  },
  {
    id: 'preset-query-data',
    name: 'Query Data',
    description: 'Generic data querying from databases and APIs',
    actions: queryDataActions
  },
  {
    id: 'preset-generic-md',
    name: 'Generic MD',
    description: 'General molecular dynamics simulation (LAMMPS, GROMACS, VASP, etc.)',
    actions: genericMdActions
  }
];

export function getPresetById(id: string): ActionSpacePreset | undefined {
  return ACTION_SPACE_PRESETS.find(p => p.id === id);
}

export function getPresetByName(name: string): ActionSpacePreset | undefined {
  return ACTION_SPACE_PRESETS.find(p => p.name.toLowerCase() === name.toLowerCase());
}
```

**Step 2: Commit**

```bash
git add src/data/actionSpacePresets.ts
git commit -m "feat(data): add action space presets for Matlantis, XTB, Crystal DB, DRXnet

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Update ActionSpaceEditor with Preset Dropdown

**Files:**
- Modify: `src/components/ActionSpaceEditor.tsx`

**Step 1: Read the current component**

**Step 2: Add preset selection dropdown and update UI**

```typescript
// Replace the entire ActionSpaceEditor.tsx file with enhanced version
import { useState } from 'react';
import type { ActionSpace, ActionDefinition } from '../types';
import { ACTION_SPACE_PRESETS } from '../data/actionSpacePresets';

interface ActionSpaceEditorProps {
  actionSpace: ActionSpace;
  onUpdate: (actionSpace: ActionSpace) => void;
}

const ACTION_TYPES = [
  {
    value: 'md_simulation',
    label: 'MD Simulation',
    defaultHints: ['structure', 'temperature', 'simulation_time', 'ensemble', 'force_field']
  },
  { value: 'matlantis_md', label: 'Matlantis MD', defaultHints: ['structure', 'temperature', 'simulation_time', 'ensemble'] },
  { value: 'xtb_calculation', label: 'XTB', defaultHints: ['structure', 'method', 'charge'] },
  { value: 'crystal_structure_query', label: 'Crystal DB', defaultHints: ['query_type', 'query_value', 'database'] },
  { value: 'drxnet_prediction', label: 'DRXnet', defaultHints: ['composition', 'current_density_rate', 'voltage_window'] },
  { value: 'experiment', label: 'Experiment', defaultHints: ['method', 'conditions', 'samples'] },
  { value: 'literature', label: 'Literature Search', defaultHints: ['keywords', 'databases'] },
  { value: 'dataset', label: 'Dataset Query', defaultHints: ['dataset_name', 'query_type'] },
  { value: 'custom', label: 'Custom', defaultHints: [] },
] as const;

export function ActionSpaceEditor({ actionSpace, onUpdate }: ActionSpaceEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ActionDefinition['type']>('custom');
  const [newDescription, setNewDescription] = useState('');
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  const handleAdd = () => {
    if (!newName.trim()) return;

    const typeConfig = ACTION_TYPES.find(t => t.value === newType);
    const newAction: ActionDefinition = {
      id: `action-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      description: newDescription.trim(),
      parameterHints: typeConfig?.defaultHints ? [...typeConfig.defaultHints] : [],
    };

    onUpdate({
      actions: [...actionSpace.actions, newAction],
    });

    setNewName('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleRemove = (actionId: string) => {
    onUpdate({
      actions: actionSpace.actions.filter(a => a.id !== actionId),
    });
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = ACTION_SPACE_PRESETS.find(p => p.id === presetId);
    if (preset) {
      // Merge preset actions with existing, avoiding duplicates by id
      const existingIds = new Set(actionSpace.actions.map(a => a.id));
      const newActions = preset.actions.filter(a => !existingIds.has(a.id));
      onUpdate({
        actions: [...actionSpace.actions, ...newActions],
      });
    }
    setShowPresetMenu(false);
  };

  const handleClearAll = () => {
    if (confirm('Clear all actions from the action space?')) {
      onUpdate({ actions: [] });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Action Space</h2>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              Load Preset ▼
            </button>
            {showPresetMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded shadow-lg z-10">
                {ACTION_SPACE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-800">{preset.name}</div>
                    <div className="text-gray-500">{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add Action
          </button>
        </div>
      </div>

      {actionSpace.actions.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">No actions defined. Load a preset or add actions manually.</p>
      )}

      {actionSpace.actions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleClearAll}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Clear All
          </button>
        </div>
      )}

      {actionSpace.actions.map(action => (
        <div key={action.id} className="bg-white rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium text-gray-800">{action.name}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {ACTION_TYPES.find(t => t.value === action.type)?.label || action.type}
              </span>
            </div>
            <button
              onClick={() => handleRemove(action.id)}
              className="text-gray-400 hover:text-red-500 text-xs"
            >
              ×
            </button>
          </div>
          {action.description && (
            <p className="text-xs text-gray-500 mt-1">{action.description}</p>
          )}
          {action.parameterHints && action.parameterHints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {action.parameterHints.map(hint => (
                <span key={hint} className="text-xs px-1 bg-blue-50 text-blue-600 rounded">
                  {hint}
                </span>
              ))}
            </div>
          )}
          {action.inputCategories && action.inputCategories.length > 0 && (
            <div className="mt-2 space-y-1">
              {action.inputCategories.map(cat => (
                <div key={cat.category} className="text-xs">
                  <span className="font-medium text-gray-600">{cat.category}:</span>
                  <span className="text-gray-500 ml-1">{cat.parameters.join(', ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {isAdding && (
        <div className="bg-blue-50 rounded border border-blue-200 p-3 space-y-2">
          <input
            type="text"
            placeholder="Action name (e.g., 'Matlantis MD Run')"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as ActionDefinition['type'])}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          >
            {ACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/ActionSpaceEditor.tsx
git commit -m "feat(ui): add preset dropdown to ActionSpaceEditor

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Test Phase 1 (Action Presets)

**Step 1: Run dev server and verify**

```bash
npm run dev
```

**Step 2: Manual verification checklist**
- [ ] "Load Preset" dropdown appears in Action Space section
- [ ] All 6 presets are listed (Matlantis, XTB, Crystal DB, DRXnet, Query Data, Generic MD)
- [ ] Clicking a preset loads its actions into the action space
- [ ] Input categories display correctly for loaded actions
- [ ] Can still manually add custom actions
- [ ] Clear All button removes all actions

**Step 3: Commit checkpoint**

```bash
git add -A
git commit -m "checkpoint: phase 1 complete - action space presets

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Hypothesis Editing (Inline + LLM-Assisted)

### Task 5: Add Inline Edit State to HypothesisCard

**Files:**
- Modify: `src/components/HypothesisCard.tsx`

**Step 1: Add inline editing for prescription, predictions, and action hooks**

The existing HypothesisCard already has:
- LLM-assisted refinement via `onRefine` callback
- Feedback input for asking questions

Add inline direct editing for:
- Prescription text
- Observable predictions
- Desirable predictions
- Action hook parameters and instructions

```typescript
// Add to HypothesisCard state (after existing state declarations)
const [isEditingPrescription, setIsEditingPrescription] = useState(false);
const [editedPrescription, setEditedPrescription] = useState(hypothesis.prescription);
const [isEditingPredictions, setIsEditingPredictions] = useState(false);
const [editedObsPrediction, setEditedObsPrediction] = useState(hypothesis.predictions.observables);
const [editedDesPrediction, setEditedDesPrediction] = useState(hypothesis.predictions.desirables);
const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

// Add new prop to interface
interface HypothesisCardProps {
  // ... existing props ...
  onDirectEdit?: (hypothesisId: string, updates: Partial<Hypothesis>) => void;
}
```

**Step 2: Add edit UI for prescription**

```typescript
{/* Prescription - Editable */}
{isEditingPrescription ? (
  <div className="mt-1">
    <textarea
      value={editedPrescription}
      onChange={e => setEditedPrescription(e.target.value)}
      className="w-full text-sm p-2 border border-blue-300 rounded"
      rows={3}
    />
    <div className="flex gap-2 mt-1">
      <button
        onClick={() => {
          onDirectEdit?.(hypothesis.id, { prescription: editedPrescription });
          setIsEditingPrescription(false);
        }}
        className="text-xs px-2 py-1 bg-green-600 text-white rounded"
      >
        Save
      </button>
      <button
        onClick={() => {
          setEditedPrescription(hypothesis.prescription);
          setIsEditingPrescription(false);
        }}
        className="text-xs px-2 py-1 bg-gray-200 rounded"
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <p
    className={`text-sm font-medium text-gray-800 mt-1 ${expanded ? '' : 'line-clamp-2'} cursor-pointer hover:bg-blue-50 rounded p-1`}
    onClick={(e) => {
      if (expanded) {
        e.stopPropagation();
        setIsEditingPrescription(true);
      }
    }}
    title={expanded ? "Click to edit" : ""}
  >
    {highlight(hypothesis.prescription)}
  </p>
)}
```

**Step 3: Update onDirectEdit handler in App.tsx**

```typescript
// In App.tsx, add handler
const handleDirectHypothesisEdit = useCallback((hypothesisId: string, updates: Partial<Hypothesis>) => {
  setHypotheses(prev => prev.map(h =>
    h.id === hypothesisId ? { ...h, ...updates } : h
  ));
}, []);
```

**Step 4: Commit**

```bash
git add src/components/HypothesisCard.tsx src/App.tsx
git commit -m "feat(ui): add inline editing for hypothesis prescription and predictions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Inline Edit for Action Hooks in HypothesisCard

**Files:**
- Modify: `src/components/HypothesisCard.tsx`

**Step 1: Add editable action hook UI**

```typescript
{/* Action Hooks - Editable */}
{hypothesis.actionHooks.length > 0 && (
  <div>
    <span className="text-xs font-medium text-gray-600">Validation Actions:</span>
    <div className="mt-1 space-y-2">
      {hypothesis.actionHooks.map((hook, i) => (
        <div key={i} className="bg-gray-50 rounded p-2 text-xs">
          <div className="flex justify-between items-start">
            <div className="font-medium text-gray-700">{hook.actionName}</div>
            <button
              onClick={() => setEditingActionIndex(editingActionIndex === i ? null : i)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {editingActionIndex === i ? 'Done' : 'Edit'}
            </button>
          </div>

          {editingActionIndex === i ? (
            <div className="mt-2 space-y-2">
              {/* Editable parameters */}
              {Object.entries(hook.parameters).map(([k, v]) => (
                <div key={k} className="flex gap-2 items-center">
                  <label className="w-24 text-gray-600">{k}:</label>
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => {
                      const newHooks = [...hypothesis.actionHooks];
                      newHooks[i] = {
                        ...newHooks[i],
                        parameters: { ...newHooks[i].parameters, [k]: e.target.value }
                      };
                      onDirectEdit?.(hypothesis.id, { actionHooks: newHooks });
                    }}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  />
                </div>
              ))}
              {/* Editable instructions */}
              <div>
                <label className="text-gray-600">Instructions:</label>
                <textarea
                  value={hook.instructions}
                  onChange={(e) => {
                    const newHooks = [...hypothesis.actionHooks];
                    newHooks[i] = { ...newHooks[i], instructions: e.target.value };
                    onDirectEdit?.(hypothesis.id, { actionHooks: newHooks });
                  }}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-1"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <>
              {Object.entries(hook.parameters).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(hook.parameters).map(([k, v]) => (
                    <span key={k} className="px-1 bg-blue-100 text-blue-700 rounded">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-gray-600">{hook.instructions}</p>
            </>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add src/components/HypothesisCard.tsx
git commit -m "feat(ui): add inline editing for action hooks in hypothesis card

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Enhance ActionDetailPanel with LLM-Assisted Refinement

**Files:**
- Modify: `src/components/ActionDetailPanel.tsx`
- Modify: `src/services/api.ts`

**Step 1: Add LLM refinement function to api.ts**

```typescript
// Add to api.ts
export async function refineActionWithFeedback(
  action: ConsolidatedAction,
  feedback: string,
  hypotheses: Hypothesis[]
): Promise<{ parameters: Record<string, string>; instructions: string }> {
  const linkedHypotheses = hypotheses
    .filter(h => action.hypothesisLinks.some(l => l.hypothesisId === h.id))
    .map(h => h.prescription)
    .join('\n- ');

  const response = await callAzureOpenAI([
    {
      role: 'system',
      content: `You are refining an action based on user feedback. The action is linked to multiple hypotheses and should serve all of them.

Return JSON only:
{
  "parameters": { "param1": "value1", ... },
  "instructions": "refined instructions"
}`
    },
    {
      role: 'user',
      content: `ACTION: ${action.actionName}
TYPE: ${action.actionType}
CURRENT PARAMETERS: ${JSON.stringify(action.commonParameters)}
CURRENT INSTRUCTIONS: ${action.consolidatedInstructions}

LINKED HYPOTHESES:
- ${linkedHypotheses}

USER FEEDBACK: ${feedback}

Refine the action based on this feedback while ensuring it still serves all linked hypotheses.`
    }
  ]);

  return JSON.parse(response);
}
```

**Step 2: Add LLM refinement to ActionDetailPanel**

```typescript
// Add to ActionDetailPanel state
const [feedbackInput, setFeedbackInput] = useState('');
const [isRefining, setIsRefining] = useState(false);

// Add new prop
onLlmRefine?: (actionId: string, feedback: string) => Promise<void>;

// Add UI in footer
<div className="mt-2">
  <label className="text-xs text-gray-600">Ask AI to refine:</label>
  <div className="flex gap-2 mt-1">
    <input
      type="text"
      value={feedbackInput}
      onChange={e => setFeedbackInput(e.target.value)}
      placeholder="e.g., 'Use higher temperature range'"
      className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
      disabled={isRefining}
    />
    <button
      onClick={async () => {
        if (!feedbackInput.trim()) return;
        setIsRefining(true);
        try {
          await onLlmRefine?.(action.id, feedbackInput);
          setFeedbackInput('');
        } finally {
          setIsRefining(false);
        }
      }}
      disabled={!feedbackInput.trim() || isRefining}
      className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
    >
      {isRefining ? '...' : 'Refine'}
    </button>
  </div>
</div>
```

**Step 3: Wire up in App.tsx**

```typescript
// Add handler in App.tsx
const handleLlmRefineAction = useCallback(async (actionId: string, feedback: string) => {
  if (!consolidatedActionSet) return;

  const action = consolidatedActionSet.actions.find(a => a.id === actionId);
  if (!action) return;

  const refined = await refineActionWithFeedback(action, feedback, hypotheses);

  setConsolidatedActionSet(prev => prev ? {
    ...prev,
    actions: prev.actions.map(a =>
      a.id === actionId
        ? { ...a, commonParameters: refined.parameters, consolidatedInstructions: refined.instructions }
        : a
    )
  } : null);
}, [consolidatedActionSet, hypotheses]);
```

**Step 4: Commit**

```bash
git add src/components/ActionDetailPanel.tsx src/services/api.ts src/App.tsx
git commit -m "feat(ui): add LLM-assisted refinement for consolidated actions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Test Phase 2 (Hypothesis Editing)

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Manual verification checklist**
- [ ] Click on prescription in expanded hypothesis card enables edit mode
- [ ] Can edit and save prescription text
- [ ] Can edit action hook parameters inline
- [ ] Can edit action hook instructions inline
- [ ] LLM refinement via feedback input works on hypothesis cards
- [ ] ActionDetailPanel shows "Ask AI to refine" input
- [ ] LLM refinement works on consolidated actions

**Step 3: Commit checkpoint**

```bash
git add -A
git commit -m "checkpoint: phase 2 complete - hypothesis and action editing

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Design Document for Action DAG & Agent Dispatch

### Task 9: Create Architecture Design Document

**Files:**
- Create: `docs/architecture/action-dag-agent-dispatch.md`

**Step 1: Write the design document**

```markdown
# Action DAG & Agent Dispatch Architecture

## Overview

This document describes the architecture for:
1. Representing actions as a Directed Acyclic Graph (DAG) with dependencies
2. Dispatching agent swarms to execute actions asynchronously
3. Managing state for long-running (hours) interactive sessions

## Core Concepts

### Action DAG

Actions form a DAG where:
- Nodes = ConsolidatedAction instances
- Edges = Dependencies (action A must complete before action B can start)

```typescript
interface ActionNode {
  actionId: string;
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
  dependencies: string[];  // actionIds that must complete first
  dependents: string[];    // actionIds waiting on this
  result?: ActionResult;
  error?: string;
  assignedAgentId?: string;
}

interface ActionDAG {
  nodes: Map<string, ActionNode>;
  topologicalOrder: string[];  // execution order

  // Methods
  addDependency(from: string, to: string): void;
  removeDependency(from: string, to: string): void;
  getReadyActions(): ActionNode[];  // actions with all deps satisfied
  markCompleted(actionId: string, result: ActionResult): void;
  markFailed(actionId: string, error: string): void;
}
```

### Dependency Detection

Dependencies can be:
1. **Explicit**: User-defined (e.g., "run relaxation before MD")
2. **Implicit**: Auto-detected from parameter references
   - If action B uses output of action A as input, B depends on A
   - Example: MD action uses structure from Crystal DB query

```typescript
interface ParameterReference {
  sourceActionId: string;
  sourceParameter: string;  // e.g., "output_structure"
  targetParameter: string;  // e.g., "structure"
}

function detectImplicitDependencies(actions: ConsolidatedAction[]): Edge[] {
  // Parse parameter values for references like "${action-123.output_structure}"
  // Return edges for detected dependencies
}
```

### State Management

For hour-long interactive sessions, state must be:
1. **Persistent**: Survives page refresh, browser close
2. **Async-queryable**: Multiple agents can read/write
3. **Conflict-aware**: Handle concurrent updates

```typescript
interface SessionState {
  id: string;
  createdAt: string;
  lastUpdatedAt: string;

  // Graph state
  hypotheses: Hypothesis[];
  actionSpace: ActionSpace;
  consolidatedActions: ConsolidatedActionSet;
  actionDag: ActionDAG;

  // Execution state
  executionRuns: ExecutionRun[];
  agentAssignments: Map<string, string>;  // actionId -> agentId
}

interface ExecutionRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  actionsCompleted: string[];
  actionsFailed: string[];
  actionsRemaining: string[];
}
```

### Agent Dispatch Pattern

```typescript
interface AgentDispatcher {
  // Configuration
  maxConcurrentAgents: number;
  agentEndpoint: string;  // URL or message queue

  // Methods
  dispatchAction(actionNode: ActionNode): Promise<string>;  // returns agentId
  checkAgentStatus(agentId: string): Promise<AgentStatus>;
  cancelAgent(agentId: string): Promise<void>;

  // Event handlers
  onActionCompleted(callback: (actionId: string, result: ActionResult) => void): void;
  onActionFailed(callback: (actionId: string, error: string) => void): void;
}

interface AgentStatus {
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;  // 0-100
  currentStep?: string;
  logs: string[];
}
```

### Backend Options

#### Option A: IndexedDB + WebSocket (Browser-only)
- State in IndexedDB for persistence
- WebSocket connection to agent coordinator
- Pros: Simple, no server needed
- Cons: Single browser, no multi-user

#### Option B: REST API + Database
- State in PostgreSQL/MongoDB
- REST API for state queries
- Agent dispatch via job queue (Redis, RabbitMQ)
- Pros: Scalable, multi-user
- Cons: Requires backend

#### Option C: Supabase (Recommended for MVP)
- Supabase for database + real-time subscriptions
- Edge functions for agent dispatch
- Pros: Managed, real-time, auth built-in
- Cons: Vendor lock-in

### UI Components

```typescript
// Action DAG Visualization
interface ActionDAGCanvas {
  dag: ActionDAG;
  onAddDependency: (from: string, to: string) => void;
  onRemoveDependency: (from: string, to: string) => void;
  onSelectAction: (actionId: string) => void;
  highlightCriticalPath?: boolean;
}

// Execution Dashboard
interface ExecutionDashboard {
  run: ExecutionRun;
  dag: ActionDAG;
  agentStatuses: Map<string, AgentStatus>;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryFailed: () => void;
}
```

## Implementation Phases

### Phase 1: DAG Visualization (Frontend only)
1. Add `dependencies` field to ConsolidatedAction
2. Create ActionDAGCanvas component
3. Allow manual dependency creation via edge drawing
4. Topological sort and critical path highlighting

### Phase 2: Local Execution Simulation
1. Add ExecutionRun state
2. Simulate sequential/parallel execution in browser
3. Mock agent responses with delays
4. Build execution dashboard UI

### Phase 3: Agent Integration
1. Define agent API contract
2. Implement AgentDispatcher for target system
3. Add WebSocket/SSE for real-time updates
4. Handle failures, retries, timeouts

### Phase 4: Persistent State
1. Choose backend (Supabase recommended)
2. Migrate state to database
3. Add multi-session support
4. Implement conflict resolution

## Integration Points

The DAG system integrates with existing code at:

1. **ActionConsolidationPanel** (`src/components/ActionConsolidationPanel.tsx`)
   - After consolidation, auto-detect dependencies
   - Offer "View as DAG" button

2. **ActionSpaceCanvas** (`src/components/ActionSpaceCanvas.tsx`)
   - Add DAG layout mode (vs current bipartite)
   - Show dependency edges with arrows

3. **App.tsx** state
   - Add `actionDag: ActionDAG | null`
   - Add `executionRuns: ExecutionRun[]`

4. **api.ts**
   - Add `detectActionDependencies(actions: ConsolidatedAction[]): Edge[]`
   - Add agent dispatch functions when ready
```

**Step 2: Commit**

```bash
mkdir -p docs/architecture
git add docs/architecture/action-dag-agent-dispatch.md
git commit -m "docs: add architecture design for action DAG and agent dispatch

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

### What was built:
1. **Action Space Presets** - 6 presets (Matlantis, XTB, Crystal DB, DRXnet, Query Data, Generic MD) with structured input categories
2. **Hypothesis Editing** - Inline editing for prescription, predictions, action hooks + LLM-assisted refinement
3. **Architecture Document** - Comprehensive design for Action DAG and agent dispatch system

### Future work (not in this plan):
- Results Analysis Tab
- DAG visualization implementation
- Agent dispatch implementation
- Multi-session persistence with Supabase

### Files created/modified:
- `src/types/index.ts` - New action types and interfaces
- `src/data/actionSpacePresets.ts` - NEW - All preset definitions
- `src/components/ActionSpaceEditor.tsx` - Preset dropdown
- `src/components/HypothesisCard.tsx` - Inline editing
- `src/components/ActionDetailPanel.tsx` - LLM refinement
- `src/services/api.ts` - Action refinement API
- `src/App.tsx` - New handlers
- `docs/architecture/action-dag-agent-dispatch.md` - NEW - Design doc
