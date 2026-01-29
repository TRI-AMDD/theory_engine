import type { ActionDefinition, ActionSpacePreset } from '../types';

// ============================================
// Preset 1: Matlantis MD
// ============================================
const matlantisActions: ActionDefinition[] = [
  {
    id: 'matlantis-md-run',
    name: 'MD Run',
    type: 'matlantis_md',
    description: 'Run molecular dynamics simulation using Matlantis universal neural network potential',
    parameterHints: ['structure', 'temperature', 'pressure', 'timestep', 'duration', 'ensemble'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'initial_velocities'],
        description: 'Input structure file (CIF, POSCAR, XYZ) and optional initial velocities'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['temperature', 'pressure', 'timestep', 'total_steps', 'ensemble', 'thermostat', 'barostat'],
        description: 'MD simulation settings including thermodynamic conditions and integration parameters'
      },
      {
        category: 'Output Settings',
        parameters: ['trajectory_interval', 'energy_interval', 'output_format', 'save_restart'],
        description: 'Control trajectory output frequency and file formats'
      }
    ]
  },
  {
    id: 'matlantis-relax',
    name: 'Structure Relaxation',
    type: 'matlantis_md',
    description: 'Optimize atomic positions and/or cell parameters to minimize energy',
    parameterHints: ['structure', 'fmax', 'steps', 'relax_cell', 'optimizer'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format'],
        description: 'Input structure file to be relaxed'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['fmax', 'max_steps', 'relax_cell', 'relax_positions', 'optimizer', 'filter'],
        description: 'Convergence criteria and optimization algorithm settings'
      },
      {
        category: 'Output Settings',
        parameters: ['save_trajectory', 'output_format'],
        description: 'Output trajectory and final structure formats'
      }
    ]
  },
  {
    id: 'matlantis-neb',
    name: 'NEB Calculation',
    type: 'matlantis_md',
    description: 'Nudged Elastic Band calculation for finding minimum energy pathway and transition states',
    parameterHints: ['initial_structure', 'final_structure', 'n_images', 'spring_constant', 'climbing_image'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['initial_structure', 'final_structure', 'n_images', 'interpolation_method'],
        description: 'Endpoint structures and number of intermediate images'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['spring_constant', 'climbing_image', 'fmax', 'max_steps', 'optimizer'],
        description: 'NEB-specific parameters including spring constants and climbing image settings'
      },
      {
        category: 'Output Settings',
        parameters: ['save_all_images', 'energy_profile_format'],
        description: 'Output settings for pathway and energy barrier results'
      }
    ]
  }
];

const matlantisPreset: ActionSpacePreset = {
  id: 'preset-matlantis',
  name: 'Matlantis MD',
  description: 'Molecular dynamics simulations using Matlantis universal neural network potential for materials science',
  actions: matlantisActions
};

// ============================================
// Preset 2: XTB (Tight Binding)
// ============================================
const xtbActions: ActionDefinition[] = [
  {
    id: 'xtb-singlepoint',
    name: 'Single Point',
    type: 'xtb_calculation',
    description: 'Single point energy and property calculation using semi-empirical tight-binding methods',
    parameterHints: ['structure', 'method', 'charge', 'multiplicity', 'solvent'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'charge', 'multiplicity'],
        description: 'Molecular structure and electronic state specification'
      },
      {
        category: 'Method Selection',
        parameters: ['method', 'accuracy', 'max_iterations'],
        description: 'Tight-binding method: GFN0-xTB, GFN1-xTB, GFN2-xTB, or GFN-FF'
      },
      {
        category: 'Environment',
        parameters: ['solvent', 'solvent_model', 'temperature'],
        description: 'Implicit solvation and temperature settings'
      },
      {
        category: 'Output Settings',
        parameters: ['calculate_charges', 'calculate_wbo', 'verbose'],
        description: 'Property calculations: charges, Wiberg bond orders, detailed output'
      }
    ]
  },
  {
    id: 'xtb-opt',
    name: 'Geometry Optimization',
    type: 'xtb_calculation',
    description: 'Optimize molecular geometry to find energy minimum',
    parameterHints: ['structure', 'method', 'opt_level', 'max_cycles', 'constraints'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'charge', 'multiplicity'],
        description: 'Initial molecular structure and electronic state'
      },
      {
        category: 'Method Selection',
        parameters: ['method', 'accuracy'],
        description: 'Tight-binding method: GFN0-xTB, GFN1-xTB, GFN2-xTB, or GFN-FF'
      },
      {
        category: 'Optimization Settings',
        parameters: ['opt_level', 'max_cycles', 'constraints', 'frozen_atoms'],
        description: 'Convergence criteria (crude/sloppy/normal/tight/vtight) and constraints'
      },
      {
        category: 'Output Settings',
        parameters: ['save_trajectory', 'frequency_calculation'],
        description: 'Output trajectory and optional frequency calculation at minimum'
      }
    ]
  },
  {
    id: 'xtb-md',
    name: 'Molecular Dynamics',
    type: 'xtb_calculation',
    description: 'Born-Oppenheimer molecular dynamics using xTB potential',
    parameterHints: ['structure', 'method', 'temperature', 'time', 'timestep', 'ensemble'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'charge', 'multiplicity'],
        description: 'Initial structure and electronic state'
      },
      {
        category: 'Method Selection',
        parameters: ['method'],
        description: 'Tight-binding method: GFN0-xTB, GFN1-xTB, GFN2-xTB, or GFN-FF'
      },
      {
        category: 'MD Parameters',
        parameters: ['temperature', 'time_ps', 'timestep_fs', 'dump_interval', 'shake', 'nvt'],
        description: 'Simulation temperature, duration, and integration settings'
      },
      {
        category: 'Output Settings',
        parameters: ['trajectory_file', 'restart_file'],
        description: 'Trajectory and restart file settings'
      }
    ]
  },
  {
    id: 'xtb-scan',
    name: 'Coordinate Scan',
    type: 'xtb_calculation',
    description: 'Scan along internal coordinates (bonds, angles, dihedrals) to map potential energy surface',
    parameterHints: ['structure', 'method', 'scan_type', 'scan_range', 'scan_steps'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'charge', 'multiplicity'],
        description: 'Molecular structure and electronic state'
      },
      {
        category: 'Method Selection',
        parameters: ['method'],
        description: 'Tight-binding method: GFN0-xTB, GFN1-xTB, GFN2-xTB, or GFN-FF'
      },
      {
        category: 'Scan Settings',
        parameters: ['scan_type', 'atom_indices', 'start_value', 'end_value', 'n_steps', 'constrained_opt'],
        description: 'Coordinate type (bond/angle/dihedral), atoms involved, and scan range'
      },
      {
        category: 'Output Settings',
        parameters: ['save_structures', 'energy_plot'],
        description: 'Save optimized structures at each point and energy profile'
      }
    ]
  }
];

const xtbPreset: ActionSpacePreset = {
  id: 'preset-xtb',
  name: 'XTB (Tight Binding)',
  description: 'Semi-empirical quantum mechanical calculations using extended tight-binding methods (GFN0-xTB, GFN1-xTB, GFN2-xTB, GFN-FF)',
  actions: xtbActions
};

// ============================================
// Preset 3: Crystal Structure Database
// ============================================
const crystalDbActions: ActionDefinition[] = [
  {
    id: 'crystal-query',
    name: 'Crystal Structure Query',
    type: 'crystal_structure_query',
    description: 'Query crystal structure databases to retrieve structures matching specified criteria',
    parameterHints: ['database', 'formula', 'space_group', 'elements', 'band_gap_range'],
    inputCategories: [
      {
        category: 'Database Selection',
        parameters: ['database', 'api_key'],
        description: 'Target database: mp (Materials Project), icsd, oqmd, aflow, cod, gnome, alexandria'
      },
      {
        category: 'Search Criteria',
        parameters: ['formula', 'elements', 'nelements', 'space_group', 'crystal_system'],
        description: 'Composition and symmetry filters'
      },
      {
        category: 'Property Filters',
        parameters: ['band_gap_min', 'band_gap_max', 'e_above_hull_max', 'is_stable', 'is_metal'],
        description: 'Electronic and thermodynamic stability filters'
      },
      {
        category: 'Output Settings',
        parameters: ['max_results', 'fields', 'output_format'],
        description: 'Number of results and which properties to return'
      }
    ]
  },
  {
    id: 'crystal-supercell',
    name: 'Create Supercell',
    type: 'crystal_structure_query',
    description: 'Create a supercell by replicating the unit cell along crystallographic axes',
    parameterHints: ['structure', 'scaling_matrix', 'na', 'nb', 'nc'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'material_id'],
        description: 'Input structure from file or database ID'
      },
      {
        category: 'Supercell Parameters',
        parameters: ['na', 'nb', 'nc', 'scaling_matrix'],
        description: 'Repetitions along a, b, c axes or full 3x3 scaling matrix'
      },
      {
        category: 'Output Settings',
        parameters: ['output_format', 'make_primitive'],
        description: 'Output format and whether to reduce to primitive cell first'
      }
    ]
  },
  {
    id: 'crystal-defect',
    name: 'Create Point Defect',
    type: 'crystal_structure_query',
    description: 'Create point defects (vacancy, substitution, interstitial) in crystal structure',
    parameterHints: ['structure', 'defect_type', 'site', 'dopant_element'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'supercell_size'],
        description: 'Host structure and supercell size for defect isolation'
      },
      {
        category: 'Defect Specification',
        parameters: ['defect_type', 'site_index', 'site_element', 'dopant_element', 'interstitial_coords'],
        description: 'Defect type (vacancy/substitution/interstitial) and site specification'
      },
      {
        category: 'Output Settings',
        parameters: ['output_format', 'generate_charge_states'],
        description: 'Output format and whether to generate different charge states'
      }
    ]
  },
  {
    id: 'crystal-surface',
    name: 'Create Surface Slab',
    type: 'crystal_structure_query',
    description: 'Create surface slab models from bulk crystal structures',
    parameterHints: ['structure', 'miller_index', 'slab_thickness', 'vacuum'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format', 'material_id'],
        description: 'Bulk structure from file or database'
      },
      {
        category: 'Surface Parameters',
        parameters: ['miller_index', 'slab_thickness', 'min_slab_size', 'vacuum', 'center_slab'],
        description: 'Miller indices (hkl), slab thickness in layers or Angstroms, vacuum spacing'
      },
      {
        category: 'Termination',
        parameters: ['termination', 'symmetric', 'primitive'],
        description: 'Surface termination selection and symmetry options'
      },
      {
        category: 'Output Settings',
        parameters: ['output_format', 'orthogonalize'],
        description: 'Output format and cell orthogonalization'
      }
    ]
  },
  {
    id: 'crystal-strain',
    name: 'Apply Strain',
    type: 'crystal_structure_query',
    description: 'Apply strain tensor to crystal structure for mechanical property studies',
    parameterHints: ['structure', 'strain_type', 'strain_magnitude'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'structure_format'],
        description: 'Input crystal structure'
      },
      {
        category: 'Strain Parameters',
        parameters: ['strain_type', 'strain_tensor', 'strain_magnitude', 'deformation_mode'],
        description: 'Strain type (uniaxial/biaxial/shear/volumetric) and magnitude in percentage'
      },
      {
        category: 'Output Settings',
        parameters: ['output_format', 'generate_series'],
        description: 'Output format and option to generate strain series'
      }
    ]
  }
];

const crystalDbPreset: ActionSpacePreset = {
  id: 'preset-crystal-db',
  name: 'Crystal Structure Database',
  description: 'Query and manipulate crystal structures from databases (Materials Project, ICSD, OQMD, AFLOW, COD, GNoME, Alexandria)',
  actions: crystalDbActions
};

// ============================================
// Preset 4: DRXnet (Battery Prediction)
// ============================================
const drxnetActions: ActionDefinition[] = [
  {
    id: 'drxnet-voltage',
    name: 'Voltage Profile',
    type: 'drxnet_prediction',
    description: 'Predict voltage profile curves for disordered rocksalt cathode materials using DRXnet',
    parameterHints: ['composition', 'current_density_rate', 'voltage_window', 'cycle_number'],
    inputCategories: [
      {
        category: 'Material Input',
        parameters: ['composition', 'structure_file'],
        description: 'Cathode composition (e.g., Li1.2Mn0.4Ti0.4O2) or structure file'
      },
      {
        category: 'Cycling Parameters',
        parameters: ['current_density_rate', 'voltage_window_min', 'voltage_window_max', 'cycle_number'],
        description: 'C-rate (5-20000 mA/g), voltage window (1.0-5.0 V), cycle number (1-891)'
      },
      {
        category: 'Prediction Settings',
        parameters: ['include_uncertainty', 'resolution'],
        description: 'Include uncertainty estimates and voltage resolution'
      }
    ]
  },
  {
    id: 'drxnet-capacity',
    name: 'Capacity Screening',
    type: 'drxnet_prediction',
    description: 'Screen multiple compositions for capacity and cycling stability',
    parameterHints: ['compositions', 'current_density_rate', 'n_cycles', 'capacity_threshold'],
    inputCategories: [
      {
        category: 'Material Input',
        parameters: ['compositions', 'composition_space'],
        description: 'List of compositions or compositional space to screen'
      },
      {
        category: 'Cycling Parameters',
        parameters: ['current_density_rate', 'voltage_window_min', 'voltage_window_max', 'n_cycles'],
        description: 'C-rate (5-20000 mA/g), voltage window (1.0-5.0 V), number of cycles for retention'
      },
      {
        category: 'Screening Criteria',
        parameters: ['min_initial_capacity', 'min_capacity_retention', 'max_voltage_hysteresis'],
        description: 'Filter criteria for initial capacity, retention, and voltage hysteresis'
      },
      {
        category: 'Output Settings',
        parameters: ['sort_by', 'top_n', 'include_predictions'],
        description: 'Ranking metric and number of top candidates to return'
      }
    ]
  }
];

const drxnetPreset: ActionSpacePreset = {
  id: 'preset-drxnet',
  name: 'DRXnet (Battery Prediction)',
  description: 'Machine learning predictions for disordered rocksalt cathode materials including voltage profiles and capacity screening',
  actions: drxnetActions
};

// ============================================
// Preset 5: Query Data
// ============================================
const queryDataActions: ActionDefinition[] = [
  {
    id: 'query-sql',
    name: 'SQL Database Query',
    type: 'dataset',
    description: 'Query relational databases using SQL to retrieve experimental or computed data',
    parameterHints: ['database', 'query', 'table', 'columns', 'filters'],
    inputCategories: [
      {
        category: 'Database Connection',
        parameters: ['database_type', 'connection_string', 'database_name'],
        description: 'Database type (PostgreSQL, MySQL, SQLite) and connection details'
      },
      {
        category: 'Query Specification',
        parameters: ['query', 'table', 'columns', 'where_clause', 'order_by', 'limit'],
        description: 'SQL query or structured query parameters'
      },
      {
        category: 'Output Settings',
        parameters: ['output_format', 'include_metadata'],
        description: 'Output format (CSV, JSON, DataFrame) and metadata inclusion'
      }
    ]
  },
  {
    id: 'query-rest',
    name: 'REST API Query',
    type: 'dataset',
    description: 'Query REST APIs to retrieve data from web services and online databases',
    parameterHints: ['endpoint', 'method', 'parameters', 'headers'],
    inputCategories: [
      {
        category: 'API Configuration',
        parameters: ['base_url', 'endpoint', 'api_key', 'auth_type'],
        description: 'API endpoint URL and authentication settings'
      },
      {
        category: 'Request Parameters',
        parameters: ['method', 'query_params', 'body', 'headers'],
        description: 'HTTP method (GET/POST), query parameters, and request body'
      },
      {
        category: 'Response Handling',
        parameters: ['response_format', 'json_path', 'pagination'],
        description: 'Expected response format and data extraction settings'
      }
    ]
  }
];

const queryDataPreset: ActionSpacePreset = {
  id: 'preset-query-data',
  name: 'Query Data',
  description: 'Query data from SQL databases and REST APIs for experimental and computed datasets',
  actions: queryDataActions
};

// ============================================
// Preset 6: Generic MD
// ============================================
const genericMdActions: ActionDefinition[] = [
  {
    id: 'generic-md-simulation',
    name: 'MD Simulation',
    type: 'md_simulation',
    description: 'Generic molecular dynamics simulation with configurable force field and ensemble',
    parameterHints: ['structure', 'force_field', 'temperature', 'pressure', 'duration', 'ensemble'],
    inputCategories: [
      {
        category: 'Structure Input',
        parameters: ['structure_file', 'topology_file', 'structure_format'],
        description: 'Input structure and topology files'
      },
      {
        category: 'Force Field',
        parameters: ['force_field', 'force_field_files', 'combination_rules'],
        description: 'Force field selection (AMBER, CHARMM, OPLS, GROMOS, etc.) and parameter files'
      },
      {
        category: 'Simulation Parameters',
        parameters: ['ensemble', 'temperature', 'pressure', 'timestep', 'total_time', 'thermostat', 'barostat'],
        description: 'Thermodynamic ensemble (NVE/NVT/NPT) and simulation conditions'
      },
      {
        category: 'Integration Settings',
        parameters: ['integrator', 'constraints', 'cutoff_scheme', 'neighbor_list_update'],
        description: 'Integration algorithm and interaction calculation settings'
      },
      {
        category: 'Output Settings',
        parameters: ['trajectory_interval', 'energy_interval', 'checkpoint_interval', 'output_format'],
        description: 'Output frequency and file formats'
      }
    ]
  }
];

const genericMdPreset: ActionSpacePreset = {
  id: 'preset-generic-md',
  name: 'Generic MD',
  description: 'Generic molecular dynamics simulation with flexible force field and ensemble options',
  actions: genericMdActions
};

// ============================================
// Export: Presets Array
// ============================================
export const ACTION_SPACE_PRESETS: ActionSpacePreset[] = [
  matlantisPreset,
  xtbPreset,
  crystalDbPreset,
  drxnetPreset,
  queryDataPreset,
  genericMdPreset
];

// ============================================
// Export: Helper Functions
// ============================================

/**
 * Get a preset by its ID
 * @param id - The preset ID (e.g., 'preset-matlantis')
 * @returns The preset if found, undefined otherwise
 */
export function getPresetById(id: string): ActionSpacePreset | undefined {
  return ACTION_SPACE_PRESETS.find(preset => preset.id === id);
}

/**
 * Get a preset by its name (case-insensitive)
 * @param name - The preset name (e.g., 'Matlantis MD')
 * @returns The preset if found, undefined otherwise
 */
export function getPresetByName(name: string): ActionSpacePreset | undefined {
  const lowerName = name.toLowerCase();
  return ACTION_SPACE_PRESETS.find(preset => preset.name.toLowerCase() === lowerName);
}
