import type { ActionType } from '../types';

// Action type definitions with parameter hints
export const ACTION_TYPES: { value: ActionType; label: string; category: string; defaultHints: string[] }[] = [
  // Original Causeway types
  {
    value: 'md_simulation',
    label: 'MD Simulation (Generic)',
    category: 'General',
    defaultHints: ['structure', 'temperature', 'simulation_time', 'ensemble', 'force_field'],
  },
  { value: 'experiment', label: 'Experiment', category: 'General', defaultHints: ['method', 'conditions', 'samples'] },
  { value: 'literature', label: 'Literature Search', category: 'General', defaultHints: ['keywords', 'databases'] },
  { value: 'dataset', label: 'Dataset Query', category: 'General', defaultHints: ['dataset_name', 'query_type'] },
  { value: 'custom', label: 'Custom', category: 'General', defaultHints: [] },

  // Shoshin Matlantis single-structure calculations
  {
    value: 'matlantis_md',
    label: 'Matlantis MD',
    category: 'Matlantis',
    defaultHints: ['structure', 'temperature', 'steps', 'timestep', 'ensemble'],
  },
  {
    value: 'matlantis_optimization',
    label: 'Structure Optimization',
    category: 'Matlantis',
    defaultHints: ['structure', 'fmax', 'optimize_cell', 'max_steps'],
  },
  {
    value: 'matlantis_diffusivity',
    label: 'Diffusivity Analysis',
    category: 'Matlantis',
    defaultHints: ['trajectory', 'species', 'temperature'],
  },
  {
    value: 'matlantis_rdf',
    label: 'RDF Analysis',
    category: 'Matlantis',
    defaultHints: ['trajectory', 'species1', 'species2', 'r_max'],
  },
  {
    value: 'matlantis_thermal',
    label: 'Thermal Conductivity',
    category: 'Matlantis',
    defaultHints: ['trajectory', 'temperature'],
  },
  {
    value: 'matlantis_elastic',
    label: 'Elastic Properties',
    category: 'Matlantis',
    defaultHints: ['structure', 'strain'],
  },
  {
    value: 'matlantis_neb',
    label: 'NEB Reaction Path',
    category: 'Matlantis',
    defaultHints: ['initial_structure', 'final_structure', 'n_images', 'fmax', 'method'],
  },
  {
    value: 'matlantis_surface',
    label: 'Surface Generation',
    category: 'Matlantis',
    defaultHints: ['structure', 'miller_h', 'miller_k', 'miller_l', 'layers', 'vacuum'],
  },
  {
    value: 'matlantis_molecule',
    label: 'Molecule Generation',
    category: 'Matlantis',
    defaultHints: ['smiles', 'name', 'optimize'],
  },
  {
    value: 'matlantis_ionic',
    label: 'Ionic Conductivity',
    category: 'Matlantis',
    defaultHints: ['trajectory', 'species', 'temperature', 'charge'],
  },
  {
    value: 'matlantis_phonon',
    label: 'Phonon DOS',
    category: 'Matlantis',
    defaultHints: ['structure', 'supercell_x', 'supercell_y', 'supercell_z', 'displacement'],
  },
  {
    value: 'matlantis_viscosity',
    label: 'Viscosity',
    category: 'Matlantis',
    defaultHints: ['trajectory', 'temperature', 'method'],
  },

  // Shoshin Matlantis batch calculations
  {
    value: 'matlantis_batch_optimization',
    label: 'Batch Optimization',
    category: 'Matlantis Batch',
    defaultHints: ['structure_list', 'fmax', 'optimize_cell', 'output_dir'],
  },
  {
    value: 'matlantis_batch_md',
    label: 'Batch MD',
    category: 'Matlantis Batch',
    defaultHints: ['structure_list', 'temperature', 'steps', 'ensemble', 'output_dir'],
  },
  {
    value: 'matlantis_batch_diffusivity',
    label: 'Batch Diffusivity',
    category: 'Matlantis Batch',
    defaultHints: ['structure_list', 'species', 'temperatures', 'steps', 'output_dir'],
  },
];

// Group action types by category for display
export const ACTION_TYPE_CATEGORIES = ACTION_TYPES.reduce((acc, type) => {
  if (!acc[type.category]) {
    acc[type.category] = [];
  }
  acc[type.category].push(type);
  return acc;
}, {} as Record<string, typeof ACTION_TYPES>);

// Check if action type is a Matlantis type
export function isMatlantisActionType(type: ActionType): boolean {
  return type.startsWith('matlantis_');
}

// Get color for action type badge
export function getActionTypeColor(type: ActionType): string {
  if (type.startsWith('matlantis_batch_')) return 'bg-purple-100 text-purple-700';
  if (type.startsWith('matlantis_')) return 'bg-cyan-100 text-cyan-700';
  switch (type) {
    case 'md_simulation': return 'bg-blue-100 text-blue-700';
    case 'experiment': return 'bg-orange-100 text-orange-700';
    case 'literature': return 'bg-emerald-100 text-emerald-700';
    case 'dataset': return 'bg-yellow-100 text-yellow-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
