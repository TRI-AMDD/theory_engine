/**
 * Computational Chemistry Context for Action Proposals
 *
 * This module provides domain-specific knowledge for MD, AIMD, and DFT
 * action proposals. It includes:
 * - Shared parameters across different simulation toolkits
 * - Structure generation keywords for database queries and modifications
 * - Force field specifications for classical MD
 */

// ============================================
// SHARED MD PARAMETERS
// ============================================
// Parameters common across MD toolkits (LAMMPS, GROMACS, AMBER, OpenMM, ASE, Matlantis)

export interface MDParameter {
  name: string;
  description: string;
  aliases: Record<string, string>; // toolkit -> parameter name
  typicalValues: string[];
  unit?: string;
}

export const MD_SHARED_PARAMETERS: MDParameter[] = [
  // Thermodynamic conditions
  {
    name: 'temperature',
    description: 'System temperature for thermostat',
    aliases: {
      lammps: 'temp',
      gromacs: 'ref_t',
      amber: 'temp0',
      openmm: 'temperature',
      ase: 'temperature',
      vasp: 'TEBEG',
      cp2k: 'TEMPERATURE'
    },
    typicalValues: ['300 K', '298.15 K', '500 K', '1000 K'],
    unit: 'K'
  },
  {
    name: 'pressure',
    description: 'System pressure for barostat',
    aliases: {
      lammps: 'press',
      gromacs: 'ref_p',
      amber: 'pres0',
      openmm: 'pressure',
      vasp: 'PSTRESS',
      cp2k: 'PRESSURE'
    },
    typicalValues: ['1 bar', '1 atm', '0 GPa', '10 GPa'],
    unit: 'bar'
  },
  {
    name: 'timestep',
    description: 'Integration timestep',
    aliases: {
      lammps: 'timestep',
      gromacs: 'dt',
      amber: 'dt',
      openmm: 'stepSize',
      ase: 'timestep',
      vasp: 'POTIM',
      cp2k: 'TIMESTEP'
    },
    typicalValues: ['1 fs', '2 fs', '0.5 fs'],
    unit: 'fs'
  },
  {
    name: 'ensemble',
    description: 'Statistical ensemble (NVE, NVT, NPT, etc.)',
    aliases: {
      lammps: 'fix nve/nvt/npt',
      gromacs: 'pcoupl + tcoupl',
      amber: 'ntb + ntp',
      openmm: 'integrator',
      vasp: 'ISIF + MDALGO',
      cp2k: 'ENSEMBLE'
    },
    typicalValues: ['NVE', 'NVT', 'NPT', 'NVT-Langevin', 'NPT-MTK']
  },
  {
    name: 'simulation_time',
    description: 'Total simulation duration',
    aliases: {
      lammps: 'run (steps)',
      gromacs: 'nsteps',
      amber: 'nstlim',
      openmm: 'steps',
      vasp: 'NSW',
      cp2k: 'STEPS'
    },
    typicalValues: ['1 ps', '10 ps', '100 ps', '1 ns', '10 ns', '100 ns'],
    unit: 'ps'
  },
  {
    name: 'thermostat',
    description: 'Temperature control algorithm',
    aliases: {
      lammps: 'fix nvt/temp',
      gromacs: 'tcoupl',
      amber: 'ntt',
      openmm: 'thermostat',
      vasp: 'MDALGO',
      cp2k: 'THERMOSTAT'
    },
    typicalValues: ['Nose-Hoover', 'Langevin', 'Berendsen', 'velocity-rescale', 'CSVR']
  },
  {
    name: 'barostat',
    description: 'Pressure control algorithm',
    aliases: {
      lammps: 'fix npt/press',
      gromacs: 'pcoupl',
      amber: 'ntp + barostat',
      openmm: 'barostat',
      vasp: 'MDALGO + ISIF',
      cp2k: 'BAROSTAT'
    },
    typicalValues: ['Parrinello-Rahman', 'Berendsen', 'MTK', 'Monte-Carlo']
  },
  {
    name: 'cutoff',
    description: 'Non-bonded interaction cutoff distance',
    aliases: {
      lammps: 'pair_style cutoff',
      gromacs: 'rlist/rcoulomb/rvdw',
      amber: 'cut',
      openmm: 'nonbondedCutoff',
      vasp: 'RCUT',
      cp2k: 'RCUT'
    },
    typicalValues: ['10 Å', '12 Å', '14 Å'],
    unit: 'Å'
  },
  {
    name: 'output_frequency',
    description: 'Trajectory/property output interval',
    aliases: {
      lammps: 'dump/thermo',
      gromacs: 'nstxout/nstvout/nstenergy',
      amber: 'ntpr/ntwx',
      openmm: 'reportInterval',
      vasp: 'NBLOCK',
      cp2k: 'PRINT_FREQ'
    },
    typicalValues: ['100 steps', '1000 steps', '1 ps']
  }
];

// ============================================
// DFT PARAMETERS
// ============================================

export interface DFTParameter {
  name: string;
  description: string;
  aliases: Record<string, string>; // code -> parameter name
  typicalValues: string[];
  category: 'convergence' | 'accuracy' | 'performance' | 'physics';
}

export const DFT_SHARED_PARAMETERS: DFTParameter[] = [
  // Accuracy parameters
  {
    name: 'xc_functional',
    description: 'Exchange-correlation functional',
    aliases: {
      vasp: 'GGA/METAGGA/LHFCALC',
      qe: 'input_dft',
      cp2k: 'XC_FUNCTIONAL',
      gaussian: 'functional',
      orca: 'functional'
    },
    typicalValues: ['PBE', 'PBEsol', 'RPBE', 'SCAN', 'r2SCAN', 'HSE06', 'PBE0', 'B3LYP'],
    category: 'physics'
  },
  {
    name: 'kpoint_density',
    description: 'Brillouin zone sampling density',
    aliases: {
      vasp: 'KPOINTS file',
      qe: 'K_POINTS',
      cp2k: 'KPOINTS',
      castep: 'kpoint_mp_grid'
    },
    typicalValues: ['2x2x2', '4x4x4', '6x6x6', '8x8x8', 'Gamma-only', 'automatic'],
    category: 'convergence'
  },
  {
    name: 'energy_cutoff',
    description: 'Plane-wave basis cutoff energy',
    aliases: {
      vasp: 'ENCUT',
      qe: 'ecutwfc',
      cp2k: 'CUTOFF',
      castep: 'cut_off_energy'
    },
    typicalValues: ['400 eV', '500 eV', '600 eV', '800 eV'],
    category: 'convergence'
  },
  {
    name: 'smearing',
    description: 'Electronic smearing method and width',
    aliases: {
      vasp: 'ISMEAR + SIGMA',
      qe: 'occupations + smearing + degauss',
      cp2k: 'SMEAR + ELECTRONIC_TEMPERATURE',
      castep: 'smearing_width'
    },
    typicalValues: ['Gaussian 0.05 eV', 'Methfessel-Paxton 0.2 eV', 'Fermi-Dirac 0.1 eV', 'tetrahedron'],
    category: 'convergence'
  },
  {
    name: 'scf_tolerance',
    description: 'Self-consistent field convergence criterion',
    aliases: {
      vasp: 'EDIFF',
      qe: 'conv_thr',
      cp2k: 'EPS_SCF',
      castep: 'elec_energy_tol'
    },
    typicalValues: ['1e-5 eV', '1e-6 eV', '1e-7 eV', '1e-8 eV'],
    category: 'convergence'
  },
  {
    name: 'force_tolerance',
    description: 'Force convergence criterion for relaxation',
    aliases: {
      vasp: 'EDIFFG',
      qe: 'forc_conv_thr',
      cp2k: 'MAX_FORCE',
      castep: 'geom_force_tol'
    },
    typicalValues: ['0.01 eV/Å', '0.02 eV/Å', '0.05 eV/Å'],
    category: 'convergence'
  },
  {
    name: 'spin_polarization',
    description: 'Spin-polarized calculation',
    aliases: {
      vasp: 'ISPIN',
      qe: 'nspin',
      cp2k: 'UKS/ROKS',
      gaussian: 'spin'
    },
    typicalValues: ['non-spin-polarized', 'collinear', 'non-collinear', 'spin-orbit'],
    category: 'physics'
  },
  {
    name: 'dispersion_correction',
    description: 'Van der Waals / dispersion correction',
    aliases: {
      vasp: 'IVDW',
      qe: 'vdw_corr',
      cp2k: 'DISPERSION_FUNCTIONAL',
      orca: 'D3BJ/D4'
    },
    typicalValues: ['none', 'D3', 'D3-BJ', 'D4', 'TS', 'MBD', 'rVV10'],
    category: 'physics'
  },
  {
    name: 'hubbard_u',
    description: 'DFT+U correction for localized electrons',
    aliases: {
      vasp: 'LDAU + LDAUU',
      qe: 'Hubbard',
      cp2k: 'DFT_PLUS_U'
    },
    typicalValues: ['none', 'U=3 eV (3d TM)', 'U=4 eV (Fe)', 'U=5 eV (Co/Ni)'],
    category: 'physics'
  }
];

// ============================================
// AIMD-SPECIFIC PARAMETERS
// ============================================

export interface AIMDParameter {
  name: string;
  description: string;
  aliases: Record<string, string>;
  typicalValues: string[];
  importance: 'critical' | 'important' | 'optional';
}

export const AIMD_SPECIFIC_PARAMETERS: AIMDParameter[] = [
  {
    name: 'md_timestep',
    description: 'AIMD integration timestep (typically smaller than classical MD)',
    aliases: {
      vasp: 'POTIM',
      cp2k: 'TIMESTEP',
      qe: 'dt'
    },
    typicalValues: ['0.5 fs', '1 fs', '2 fs'],
    importance: 'critical'
  },
  {
    name: 'ionic_temperature',
    description: 'Target temperature for ions',
    aliases: {
      vasp: 'TEBEG/TEEND',
      cp2k: 'TEMPERATURE',
      qe: 'tempw'
    },
    typicalValues: ['300 K', '500 K', '1000 K', '1500 K'],
    importance: 'critical'
  },
  {
    name: 'thermostat_timescale',
    description: 'Thermostat coupling time constant',
    aliases: {
      vasp: 'SMASS',
      cp2k: 'TIMECON',
      qe: 'nraise'
    },
    typicalValues: ['50 fs', '100 fs', '500 fs'],
    importance: 'important'
  },
  {
    name: 'trajectory_length',
    description: 'Total AIMD simulation time',
    aliases: {
      vasp: 'NSW × POTIM',
      cp2k: 'STEPS × TIMESTEP',
      qe: 'nstep × dt'
    },
    typicalValues: ['1 ps', '5 ps', '10 ps', '50 ps', '100 ps'],
    importance: 'critical'
  },
  {
    name: 'equilibration_time',
    description: 'Time to equilibrate before production',
    aliases: {},
    typicalValues: ['1 ps', '2 ps', '5 ps'],
    importance: 'important'
  }
];

// ============================================
// STRUCTURE GENERATION KEYWORDS
// ============================================

export interface StructureDatabase {
  name: string;
  shortName: string;
  description: string;
  queryKeywords: string[];
  apiEndpoint?: string;
  coverage: string;
}

export const STRUCTURE_DATABASES: StructureDatabase[] = [
  {
    name: 'Materials Project',
    shortName: 'MP',
    description: 'Comprehensive database of DFT-computed materials properties',
    queryKeywords: ['mp-id', 'mp_id', 'materials_project_id', 'MP:'],
    apiEndpoint: 'https://api.materialsproject.org',
    coverage: '150k+ inorganic compounds with DFT properties'
  },
  {
    name: 'ICSD',
    shortName: 'ICSD',
    description: 'Inorganic Crystal Structure Database - experimental structures',
    queryKeywords: ['icsd-id', 'icsd_collection_code', 'ICSD:'],
    coverage: '260k+ experimental inorganic structures'
  },
  {
    name: 'AFLOW',
    shortName: 'AFLOW',
    description: 'Automatic FLOW for materials discovery',
    queryKeywords: ['aflow-id', 'auid', 'AFLOW:'],
    apiEndpoint: 'http://aflowlib.org/API',
    coverage: '3.5M+ compounds with DFT data'
  },
  {
    name: 'COD',
    shortName: 'COD',
    description: 'Crystallography Open Database',
    queryKeywords: ['cod-id', 'COD:'],
    apiEndpoint: 'https://www.crystallography.net/cod',
    coverage: '500k+ organic and inorganic structures'
  },
  {
    name: 'OQMD',
    shortName: 'OQMD',
    description: 'Open Quantum Materials Database',
    queryKeywords: ['oqmd-id', 'OQMD:'],
    apiEndpoint: 'http://oqmd.org/api',
    coverage: '1M+ DFT calculations'
  },
  {
    name: 'JARVIS',
    shortName: 'JARVIS',
    description: 'Joint Automated Repository for Various Integrated Simulations',
    queryKeywords: ['jarvis-id', 'jid', 'JARVIS:'],
    apiEndpoint: 'https://jarvis.nist.gov/api',
    coverage: '80k+ materials with DFT, ML potentials, and experiments'
  },
  {
    name: 'GNoME',
    shortName: 'GNoME',
    description: 'Google DeepMind Graph Networks for Materials Exploration',
    queryKeywords: ['gnome-id', 'GNoME:'],
    coverage: '380k+ new stable materials predicted by ML'
  },
  {
    name: 'Alexandria',
    shortName: 'Alexandria',
    description: 'PBE-D3 DFT database with high accuracy',
    queryKeywords: ['alexandria-id', 'ALEX:'],
    coverage: '5M+ structures from PBE-D3 calculations'
  }
];

// Structure modification keywords for downstream agents
export interface StructureModification {
  type: string;
  description: string;
  keywords: string[];
  parameters: string[];
  examples: string[];
}

export const STRUCTURE_MODIFICATIONS: StructureModification[] = [
  {
    type: 'supercell',
    description: 'Create periodic supercell from unit cell',
    keywords: ['supercell', 'replicate', 'expand', 'multiply'],
    parameters: ['nx', 'ny', 'nz', 'scaling_matrix'],
    examples: ['2x2x2 supercell', '3x3x1 slab supercell', 'orthorhombic supercell']
  },
  {
    type: 'defect_vacancy',
    description: 'Remove atoms to create vacancy defects',
    keywords: ['vacancy', 'remove_atom', 'v_X', 'schottky'],
    parameters: ['vacancy_site', 'vacancy_concentration', 'vacancy_species'],
    examples: ['5% Li vacancies', 'O vacancy at (0.5, 0.5, 0.5)', 'Schottky pair']
  },
  {
    type: 'defect_substitution',
    description: 'Replace atoms with different species',
    keywords: ['substitution', 'doping', 'replace', 'antisite'],
    parameters: ['dopant_species', 'host_species', 'concentration', 'site_preference'],
    examples: ['5% Al doping on Fe sites', 'Mn substitution for Co', 'antisite defect']
  },
  {
    type: 'defect_interstitial',
    description: 'Insert atoms at interstitial positions',
    keywords: ['interstitial', 'insert', 'add_atom', 'frenkel'],
    parameters: ['interstitial_species', 'interstitial_site', 'concentration'],
    examples: ['Li interstitial', 'O interstitial at octahedral site', 'Frenkel pair']
  },
  {
    type: 'surface_slab',
    description: 'Create surface slab model from bulk',
    keywords: ['surface', 'slab', 'miller_index', 'termination'],
    parameters: ['miller_index', 'slab_thickness', 'vacuum_thickness', 'termination'],
    examples: ['(110) surface 4-layer slab', '15Å vacuum', 'O-terminated (001)']
  },
  {
    type: 'strain',
    description: 'Apply strain to lattice',
    keywords: ['strain', 'deformation', 'compress', 'stretch', 'shear'],
    parameters: ['strain_tensor', 'strain_magnitude', 'strain_direction'],
    examples: ['2% biaxial strain', '-1% hydrostatic compression', 'shear strain']
  },
  {
    type: 'interface',
    description: 'Create interface between two materials',
    keywords: ['interface', 'heterojunction', 'grain_boundary', 'stacking'],
    parameters: ['material_A', 'material_B', 'orientation_A', 'orientation_B', 'separation'],
    examples: ['LiCoO2/Li3PO4 interface', 'twist bilayer', 'Σ5 grain boundary']
  },
  {
    type: 'disorder',
    description: 'Create disordered/random structures',
    keywords: ['disorder', 'random', 'SQS', 'special_quasirandom', 'amorphous'],
    parameters: ['disorder_type', 'correlation_length', 'composition'],
    examples: ['SQS for Li0.5Mn0.5O2', 'amorphous Li3PS4', 'cation disorder']
  },
  {
    type: 'adsorbate',
    description: 'Add molecules or atoms to surface',
    keywords: ['adsorbate', 'adsorption', 'coverage', 'binding_site'],
    parameters: ['adsorbate_species', 'coverage', 'binding_site', 'orientation'],
    examples: ['0.25 ML O2 on Pt(111)', 'CO at atop site', 'H2O monolayer']
  },
  {
    type: 'nanoparticle',
    description: 'Create nanoparticle or cluster',
    keywords: ['nanoparticle', 'cluster', 'wulff', 'nanocrystal'],
    parameters: ['diameter', 'shape', 'facets', 'core_shell'],
    examples: ['3 nm Pt nanoparticle', 'Wulff construction', 'Au@Pd core-shell']
  }
];

// ============================================
// FORCE FIELD KEYWORDS
// ============================================

export interface ForceFieldFamily {
  name: string;
  description: string;
  keywords: string[];
  typicalSystems: string[];
  software: string[];
}

export const FORCE_FIELD_FAMILIES: ForceFieldFamily[] = [
  {
    name: 'ReaxFF',
    description: 'Reactive force field for bond breaking/forming',
    keywords: ['reaxff', 'reactive', 'combustion', 'oxidation'],
    typicalSystems: ['combustion', 'oxidation', 'catalysis', 'battery interfaces'],
    software: ['LAMMPS', 'AMS/ADF', 'GULP']
  },
  {
    name: 'Machine Learning Potentials',
    description: 'Neural network or kernel-based interatomic potentials',
    keywords: ['mlp', 'nnp', 'gap', 'mace', 'nequip', 'allegro', 'chgnet', 'm3gnet', 'matlantis'],
    typicalSystems: ['any system with DFT training data'],
    software: ['ASE', 'LAMMPS', 'Matlantis', 'GPUMD']
  },
  {
    name: 'EAM/MEAM',
    description: 'Embedded atom methods for metals',
    keywords: ['eam', 'meam', 'embedded_atom', 'metallic'],
    typicalSystems: ['metals', 'alloys', 'metallic glasses'],
    software: ['LAMMPS', 'OpenMM']
  },
  {
    name: 'CHARMM/AMBER/OPLS',
    description: 'Biomolecular force fields',
    keywords: ['charmm', 'amber', 'opls', 'gromos', 'biomolecular'],
    typicalSystems: ['proteins', 'nucleic acids', 'lipids', 'small molecules'],
    software: ['GROMACS', 'AMBER', 'OpenMM', 'NAMD']
  },
  {
    name: 'Buckingham/Born-Mayer',
    description: 'Ionic/ceramic force fields',
    keywords: ['buckingham', 'born_mayer', 'ionic', 'ceramic'],
    typicalSystems: ['oxides', 'ceramics', 'ionic crystals'],
    software: ['GULP', 'LAMMPS', 'DL_POLY']
  },
  {
    name: 'Tersoff/REBO',
    description: 'Bond-order potentials for covalent systems',
    keywords: ['tersoff', 'rebo', 'airebo', 'bond_order', 'covalent'],
    typicalSystems: ['Si', 'C', 'SiC', 'hydrocarbons'],
    software: ['LAMMPS', 'ASE']
  }
];

// ============================================
// ACTION PARAMETER TEMPLATES
// ============================================
// Pre-built parameter sets for common simulation types

export interface ActionParameterTemplate {
  name: string;
  description: string;
  actionType: 'md_simulation' | 'experiment' | 'custom';
  suggestedParameters: Record<string, string>;
  requiredParameters: string[];
  optionalParameters: string[];
}

export const ACTION_PARAMETER_TEMPLATES: ActionParameterTemplate[] = [
  {
    name: 'Classical MD - Equilibrium',
    description: 'Standard equilibrium MD simulation',
    actionType: 'md_simulation',
    suggestedParameters: {
      ensemble: 'NPT',
      temperature: '300 K',
      pressure: '1 bar',
      timestep: '1 fs',
      simulation_time: '1 ns',
      thermostat: 'Nose-Hoover',
      barostat: 'Parrinello-Rahman'
    },
    requiredParameters: ['structure', 'force_field', 'temperature', 'simulation_time'],
    optionalParameters: ['pressure', 'ensemble', 'thermostat', 'barostat', 'cutoff']
  },
  {
    name: 'Classical MD - Transport',
    description: 'MD for diffusion coefficient calculation',
    actionType: 'md_simulation',
    suggestedParameters: {
      ensemble: 'NVT',
      temperature: '300-1000 K',
      timestep: '1 fs',
      simulation_time: '10-100 ns',
      output_frequency: '100 steps',
      analysis: 'MSD, diffusion coefficient'
    },
    requiredParameters: ['structure', 'force_field', 'temperature', 'simulation_time'],
    optionalParameters: ['temperature_range', 'output_frequency']
  },
  {
    name: 'AIMD - Standard',
    description: 'Ab initio MD for short-timescale dynamics',
    actionType: 'md_simulation',
    suggestedParameters: {
      xc_functional: 'PBE',
      dispersion: 'D3-BJ',
      energy_cutoff: '400-600 eV',
      kpoints: 'Gamma or 2x2x2',
      timestep: '1 fs',
      simulation_time: '10-50 ps',
      thermostat: 'Nose-Hoover'
    },
    requiredParameters: ['structure', 'xc_functional', 'temperature', 'simulation_time'],
    optionalParameters: ['dispersion', 'energy_cutoff', 'kpoints', 'hubbard_u']
  },
  {
    name: 'DFT - Relaxation',
    description: 'Geometry optimization / structure relaxation',
    actionType: 'md_simulation',
    suggestedParameters: {
      xc_functional: 'PBE',
      energy_cutoff: '520 eV',
      kpoint_density: '30/Å (KSPACING)',
      scf_tolerance: '1e-6 eV',
      force_tolerance: '0.01 eV/Å',
      relax_cell: 'yes/no'
    },
    requiredParameters: ['structure', 'xc_functional'],
    optionalParameters: ['dispersion', 'hubbard_u', 'spin_polarization', 'relax_cell']
  },
  {
    name: 'DFT - Electronic Structure',
    description: 'Band structure and DOS calculation',
    actionType: 'md_simulation',
    suggestedParameters: {
      xc_functional: 'PBE or HSE06',
      energy_cutoff: '520 eV',
      kpoint_density: 'high (8x8x8+)',
      smearing: 'tetrahedron',
      band_path: 'from spglib'
    },
    requiredParameters: ['structure', 'xc_functional', 'kpoint_density'],
    optionalParameters: ['spin_orbit', 'hybrid_functional']
  },
  {
    name: 'DFT - Formation Energy',
    description: 'Calculate defect or compound formation energy',
    actionType: 'md_simulation',
    suggestedParameters: {
      xc_functional: 'PBE',
      energy_cutoff: '520 eV',
      kpoint_density: '30/Å',
      reference_states: 'elemental references',
      correction: 'finite-size corrections if needed'
    },
    requiredParameters: ['structure', 'reference_structures', 'xc_functional'],
    optionalParameters: ['charged_defect_correction', 'hubbard_u']
  },
  {
    name: 'NEB - Migration Barrier',
    description: 'Nudged elastic band for diffusion barriers',
    actionType: 'md_simulation',
    suggestedParameters: {
      method: 'CI-NEB',
      num_images: '5-9',
      spring_constant: '5 eV/Å²',
      force_tolerance: '0.03 eV/Å',
      initial_state: 'relaxed',
      final_state: 'relaxed'
    },
    requiredParameters: ['initial_structure', 'final_structure', 'xc_functional'],
    optionalParameters: ['num_images', 'climbing_image']
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all parameter hints for a given simulation type
 */
export function getParameterHintsForType(simType: 'md' | 'aimd' | 'dft'): string[] {
  switch (simType) {
    case 'md':
      return MD_SHARED_PARAMETERS.map(p => p.name);
    case 'aimd':
      return [
        ...AIMD_SPECIFIC_PARAMETERS.map(p => p.name),
        ...DFT_SHARED_PARAMETERS.filter(p => ['xc_functional', 'dispersion_correction', 'energy_cutoff'].includes(p.name)).map(p => p.name)
      ];
    case 'dft':
      return DFT_SHARED_PARAMETERS.map(p => p.name);
    default:
      return [];
  }
}

/**
 * Get structure generation prompt context for LLM
 */
export function getStructureGenerationContext(): string {
  const databases = STRUCTURE_DATABASES.map(db =>
    `- ${db.name} (${db.shortName}): ${db.description}. Query with: ${db.queryKeywords.join(', ')}`
  ).join('\n');

  const modifications = STRUCTURE_MODIFICATIONS.map(mod =>
    `- ${mod.type}: ${mod.description}. Keywords: ${mod.keywords.join(', ')}. Parameters: ${mod.parameters.join(', ')}`
  ).join('\n');

  return `
## Structure Databases
${databases}

## Structure Modifications
${modifications}

## Structure Specification Format
When specifying structures, use the following format:
- Database reference: "DB:id" (e.g., "MP:mp-149" for silicon from Materials Project)
- With modifications: "DB:id + modification(params)" (e.g., "MP:mp-149 + supercell(3x3x3) + vacancy(Si, 2%)")
- Composition query: "DB:formula" (e.g., "MP:LiCoO2" to search for structures)
`;
}

/**
 * Get simulation parameter context for LLM action generation
 */
export function getSimulationParameterContext(): string {
  const mdParams = MD_SHARED_PARAMETERS.map(p =>
    `- ${p.name}: ${p.description}. Typical: ${p.typicalValues.slice(0, 3).join(', ')}`
  ).join('\n');

  const dftParams = DFT_SHARED_PARAMETERS.map(p =>
    `- ${p.name}: ${p.description}. Typical: ${p.typicalValues.slice(0, 3).join(', ')}`
  ).join('\n');

  const ffFamilies = FORCE_FIELD_FAMILIES.map(ff =>
    `- ${ff.name}: ${ff.description}. For: ${ff.typicalSystems.slice(0, 2).join(', ')}`
  ).join('\n');

  return `
## Molecular Dynamics Parameters (shared across LAMMPS, GROMACS, ASE, etc.)
${mdParams}

## DFT Parameters (shared across VASP, QE, CP2K, etc.)
${dftParams}

## Force Field Families
${ffFamilies}
`;
}

/**
 * Format parameter for specific toolkit
 */
export function formatParameterForToolkit(
  paramName: string,
  toolkit: string
): { toolkitParam: string; found: boolean } {
  const mdParam = MD_SHARED_PARAMETERS.find(p => p.name === paramName);
  if (mdParam && mdParam.aliases[toolkit.toLowerCase()]) {
    return { toolkitParam: mdParam.aliases[toolkit.toLowerCase()], found: true };
  }

  const dftParam = DFT_SHARED_PARAMETERS.find(p => p.name === paramName);
  if (dftParam && dftParam.aliases[toolkit.toLowerCase()]) {
    return { toolkitParam: dftParam.aliases[toolkit.toLowerCase()], found: true };
  }

  return { toolkitParam: paramName, found: false };
}
