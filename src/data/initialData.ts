import type { CausalNode, CausalEdge, CausalGraph } from '../types';

// ============ PRESET 1: RDE Catalysis Experiment ============
const rdeContext = `This causal model represents factors affecting current density measurements in a rotating disc electrode (RDE) experiment for studying oxygen reduction reaction (ORR) catalysis. The RDE setup allows controlled mass transport through electrode rotation, enabling kinetic analysis of electrocatalyst performance. Key measurements include limiting current density and half-wave potential, which depend on catalyst properties, electrolyte composition, and experimental conditions.`;

const rdeNodes: CausalNode[] = [
  {
    id: "current_density",
    variableName: "current_density",
    displayName: "Current Density",
    description: "The measured electrical current per unit electrode area (mA/cm²)",
    position: { x: 400, y: 300 }
  },
  {
    id: "rotation_rate",
    variableName: "rotation_rate",
    displayName: "Rotation Rate",
    description: "Angular velocity of the electrode (rpm), controls mass transport",
    position: { x: 100, y: 100 }
  },
  {
    id: "catalyst_loading",
    variableName: "catalyst_loading",
    displayName: "Catalyst Loading",
    description: "Amount of catalyst material on the electrode surface (µg/cm²)",
    position: { x: 250, y: 50 }
  },
  {
    id: "electrolyte_conc",
    variableName: "electrolyte_conc",
    displayName: "Electrolyte Concentration",
    description: "Concentration of the supporting electrolyte (M)",
    position: { x: 550, y: 50 }
  },
  {
    id: "oxygen_saturation",
    variableName: "oxygen_saturation",
    displayName: "Oxygen Saturation",
    description: "Dissolved O₂ concentration in the electrolyte",
    position: { x: 700, y: 100 }
  },
  {
    id: "temperature",
    variableName: "temperature",
    displayName: "Temperature",
    description: "Electrolyte temperature affecting kinetics and diffusion",
    position: { x: 700, y: 250 }
  }
];

const rdeEdges: CausalEdge[] = [
  { id: "e1", source: "rotation_rate", target: "current_density" },
  { id: "e2", source: "catalyst_loading", target: "current_density" },
  { id: "e3", source: "electrolyte_conc", target: "current_density" },
  { id: "e4", source: "oxygen_saturation", target: "current_density" },
  { id: "e5", source: "temperature", target: "current_density" },
  { id: "e6", source: "temperature", target: "oxygen_saturation" }
];

// ============ PRESET 2: Battery Coin Cell Cycling ============
const batteryContext = `This causal model represents factors affecting capacity fade during lithium-ion coin cell cycling experiments. The coin cell format (CR2032) is used to evaluate electrode materials under controlled conditions. Key measurements include discharge capacity, coulombic efficiency, and capacity retention over cycles. Performance depends on electrode formulation, electrolyte composition, cycling protocol, and cell assembly quality.`;

const batteryNodes: CausalNode[] = [
  // Top-level upstream nodes (y: -50 to 50 range)
  {
    id: "particle_size",
    variableName: "particle_size",
    displayName: "Particle Size",
    description: "Active material particle diameter distribution (D50 in µm)",
    position: { x: 50, y: -50 }
  },
  {
    id: "binder_content",
    variableName: "binder_content",
    displayName: "Binder Content",
    description: "Weight percentage of polymeric binder (PVDF) in electrode formulation (%)",
    position: { x: 200, y: -50 }
  },
  {
    id: "calendering_pressure",
    variableName: "calendering_pressure",
    displayName: "Calendering Pressure",
    description: "Roll press pressure applied to densify electrode coating (MPa)",
    position: { x: 400, y: -50 }
  },
  {
    id: "slurry_viscosity",
    variableName: "slurry_viscosity",
    displayName: "Slurry Viscosity",
    description: "Rheological properties of electrode slurry before coating (Pa·s)",
    position: { x: 550, y: -50 }
  },
  {
    id: "drying_temperature",
    variableName: "drying_temperature",
    displayName: "Drying Temperature",
    description: "Electrode drying/curing temperature after coating (°C)",
    position: { x: 700, y: 0 }
  },
  // Mid-level nodes (y: 50 to 150 range)
  {
    id: "capacity_fade",
    variableName: "capacity_fade",
    displayName: "Capacity Fade",
    description: "Loss of discharge capacity over cycling (mAh/g lost per cycle)",
    position: { x: 400, y: 400 }
  },
  {
    id: "c_rate",
    variableName: "c_rate",
    displayName: "C-Rate",
    description: "Charge/discharge rate relative to capacity (e.g., 1C = full discharge in 1 hour)",
    position: { x: 100, y: 150 }
  },
  {
    id: "voltage_window",
    variableName: "voltage_window",
    displayName: "Voltage Window",
    description: "Upper and lower cutoff voltages during cycling (V)",
    position: { x: 250, y: 100 }
  },
  {
    id: "electrode_thickness",
    variableName: "electrode_thickness",
    displayName: "Electrode Thickness",
    description: "Active material coating thickness on current collector (µm)",
    position: { x: 400, y: 100 }
  },
  {
    id: "electrolyte_volume",
    variableName: "electrolyte_volume",
    displayName: "Electrolyte Volume",
    description: "Amount of electrolyte added to the cell (µL)",
    position: { x: 550, y: 100 }
  },
  {
    id: "formation_cycles",
    variableName: "formation_cycles",
    displayName: "Formation Cycles",
    description: "Number and rate of initial SEI-forming cycles",
    position: { x: 700, y: 150 }
  },
  {
    id: "temperature",
    variableName: "temperature",
    displayName: "Temperature",
    description: "Cell temperature during cycling (°C)",
    position: { x: 750, y: 300 }
  },
  {
    id: "sei_stability",
    variableName: "sei_stability",
    displayName: "SEI Stability",
    description: "Solid electrolyte interphase quality and stability",
    position: { x: 550, y: 250 }
  }
];

const batteryEdges: CausalEdge[] = [
  // Existing edges (mid-level to capacity_fade)
  { id: "b1", source: "c_rate", target: "capacity_fade" },
  { id: "b2", source: "voltage_window", target: "capacity_fade" },
  { id: "b3", source: "electrode_thickness", target: "capacity_fade" },
  { id: "b4", source: "electrolyte_volume", target: "capacity_fade" },
  { id: "b5", source: "sei_stability", target: "capacity_fade" },
  { id: "b6", source: "temperature", target: "capacity_fade" },
  { id: "b7", source: "formation_cycles", target: "sei_stability" },
  { id: "b8", source: "temperature", target: "sei_stability" },
  { id: "b9", source: "electrolyte_volume", target: "sei_stability" },
  // New upstream edges (top-level to mid-level)
  { id: "b10", source: "particle_size", target: "c_rate" },
  { id: "b11", source: "particle_size", target: "electrode_thickness" },
  { id: "b12", source: "binder_content", target: "electrode_thickness" },
  { id: "b13", source: "binder_content", target: "c_rate" },
  { id: "b14", source: "calendering_pressure", target: "electrode_thickness" },
  { id: "b15", source: "slurry_viscosity", target: "electrode_thickness" },
  { id: "b16", source: "slurry_viscosity", target: "electrolyte_volume" },
  { id: "b17", source: "drying_temperature", target: "formation_cycles" },
  { id: "b18", source: "drying_temperature", target: "sei_stability" }
];

// ============ PRESET 3: Enzyme Kinetics Assay ============
const enzymeContext = `This causal model represents factors affecting enzyme activity measurements in a microplate-based kinetics assay. The experiment uses spectrophotometric detection to monitor substrate conversion over time. Key measurements include reaction velocity (Vmax), Michaelis constant (Km), and enzyme inhibition. Results depend on enzyme preparation, substrate concentration, buffer conditions, and assay protocol.`;

const enzymeNodes: CausalNode[] = [
  {
    id: "reaction_velocity",
    variableName: "reaction_velocity",
    displayName: "Reaction Velocity",
    description: "Rate of substrate conversion to product (µM/min)",
    position: { x: 400, y: 350 }
  },
  {
    id: "substrate_conc",
    variableName: "substrate_conc",
    displayName: "Substrate Concentration",
    description: "Initial concentration of substrate in the assay (µM)",
    position: { x: 100, y: 100 }
  },
  {
    id: "enzyme_conc",
    variableName: "enzyme_conc",
    displayName: "Enzyme Concentration",
    description: "Amount of enzyme added to each well (nM)",
    position: { x: 250, y: 50 }
  },
  {
    id: "ph",
    variableName: "ph",
    displayName: "Buffer pH",
    description: "pH of the reaction buffer",
    position: { x: 400, y: 50 }
  },
  {
    id: "temperature",
    variableName: "temperature",
    displayName: "Temperature",
    description: "Incubation temperature during the assay (°C)",
    position: { x: 550, y: 50 }
  },
  {
    id: "ionic_strength",
    variableName: "ionic_strength",
    displayName: "Ionic Strength",
    description: "Salt concentration in the buffer (mM)",
    position: { x: 700, y: 100 }
  },
  {
    id: "enzyme_stability",
    variableName: "enzyme_stability",
    displayName: "Enzyme Stability",
    description: "Active enzyme fraction remaining over time",
    position: { x: 550, y: 200 }
  }
];

const enzymeEdges: CausalEdge[] = [
  { id: "z1", source: "substrate_conc", target: "reaction_velocity" },
  { id: "z2", source: "enzyme_conc", target: "reaction_velocity" },
  { id: "z3", source: "enzyme_stability", target: "reaction_velocity" },
  { id: "z4", source: "temperature", target: "reaction_velocity" },
  { id: "z5", source: "ph", target: "enzyme_stability" },
  { id: "z6", source: "temperature", target: "enzyme_stability" },
  { id: "z7", source: "ionic_strength", target: "enzyme_stability" }
];

// ============ PRESET 4: DFT Calculation ============
const dftContext = `This causal model represents factors affecting the accuracy and convergence of Density Functional Theory (DFT) calculations for materials science. DFT calculations compute electronic structure to predict forces, energies, and stresses on atoms. Results depend on computational parameters (basis set, k-point sampling, exchange-correlation functional), system setup (structure, pseudopotentials), and convergence criteria. Accurate predictions enable materials discovery and property optimization.`;

const dftNodes: CausalNode[] = [
  // Output nodes (bottom tier, y: 400-450)
  {
    id: "total_energy",
    variableName: "total_energy",
    displayName: "Total Energy",
    description: "Computed ground state energy of the system (eV)",
    position: { x: 200, y: 450 }
  },
  {
    id: "atomic_forces",
    variableName: "atomic_forces",
    displayName: "Atomic Forces",
    description: "Forces on each atom from electronic structure (eV/Å)",
    position: { x: 400, y: 450 }
  },
  {
    id: "stress_tensor",
    variableName: "stress_tensor",
    displayName: "Stress Tensor",
    description: "Mechanical stress on the unit cell (GPa)",
    position: { x: 600, y: 450 }
  },
  // Intermediate nodes (mid tier, y: 250-300)
  {
    id: "electron_density",
    variableName: "electron_density",
    displayName: "Electron Density",
    description: "Self-consistent charge density distribution",
    position: { x: 300, y: 300 }
  },
  {
    id: "band_structure",
    variableName: "band_structure",
    displayName: "Band Structure",
    description: "Electronic band energies across k-space",
    position: { x: 500, y: 300 }
  },
  {
    id: "scf_convergence",
    variableName: "scf_convergence",
    displayName: "SCF Convergence",
    description: "Self-consistent field iteration convergence quality",
    position: { x: 700, y: 250 }
  },
  // Primary parameters (upper-mid tier, y: 100-150)
  {
    id: "xc_functional",
    variableName: "xc_functional",
    displayName: "XC Functional",
    description: "Exchange-correlation functional choice (PBE, HSE, etc.)",
    position: { x: 100, y: 150 }
  },
  {
    id: "kpoint_mesh",
    variableName: "kpoint_mesh",
    displayName: "K-Point Mesh",
    description: "Brillouin zone sampling density (e.g., 8×8×8)",
    position: { x: 250, y: 100 }
  },
  {
    id: "cutoff_energy",
    variableName: "cutoff_energy",
    displayName: "Cutoff Energy",
    description: "Plane-wave basis set energy cutoff (eV)",
    position: { x: 400, y: 100 }
  },
  {
    id: "pseudopotential",
    variableName: "pseudopotential",
    displayName: "Pseudopotential",
    description: "Core electron approximation (PAW, USPP, NC)",
    position: { x: 550, y: 100 }
  },
  {
    id: "smearing_width",
    variableName: "smearing_width",
    displayName: "Smearing Width",
    description: "Electronic occupation smearing parameter (eV)",
    position: { x: 700, y: 100 }
  },
  {
    id: "scf_tolerance",
    variableName: "scf_tolerance",
    displayName: "SCF Tolerance",
    description: "Energy convergence threshold for SCF cycles (eV)",
    position: { x: 850, y: 150 }
  },
  // System setup (top tier, y: -50 to 0)
  {
    id: "crystal_structure",
    variableName: "crystal_structure",
    displayName: "Crystal Structure",
    description: "Input atomic positions and lattice parameters",
    position: { x: 150, y: -50 }
  },
  {
    id: "spin_polarization",
    variableName: "spin_polarization",
    displayName: "Spin Polarization",
    description: "Whether spin-up/down are treated separately",
    position: { x: 350, y: -50 }
  },
  {
    id: "relativistic_effects",
    variableName: "relativistic_effects",
    displayName: "Relativistic Effects",
    description: "Scalar relativistic or spin-orbit coupling treatment",
    position: { x: 550, y: -50 }
  },
  {
    id: "system_size",
    variableName: "system_size",
    displayName: "System Size",
    description: "Number of atoms in the supercell",
    position: { x: 750, y: 0 }
  },
  {
    id: "symmetry",
    variableName: "symmetry",
    displayName: "Symmetry",
    description: "Crystal symmetry used to reduce computational cost",
    position: { x: 900, y: -50 }
  }
];

const dftEdges: CausalEdge[] = [
  // System setup → Parameters
  { id: "d1", source: "crystal_structure", target: "kpoint_mesh" },
  { id: "d2", source: "crystal_structure", target: "pseudopotential" },
  { id: "d3", source: "spin_polarization", target: "xc_functional" },
  { id: "d4", source: "relativistic_effects", target: "pseudopotential" },
  { id: "d5", source: "system_size", target: "kpoint_mesh" },
  { id: "d6", source: "system_size", target: "cutoff_energy" },
  { id: "d7", source: "symmetry", target: "kpoint_mesh" },
  // Parameters → Intermediate
  { id: "d8", source: "xc_functional", target: "electron_density" },
  { id: "d9", source: "kpoint_mesh", target: "band_structure" },
  { id: "d10", source: "cutoff_energy", target: "electron_density" },
  { id: "d11", source: "pseudopotential", target: "electron_density" },
  { id: "d12", source: "smearing_width", target: "band_structure" },
  { id: "d13", source: "scf_tolerance", target: "scf_convergence" },
  { id: "d14", source: "kpoint_mesh", target: "scf_convergence" },
  { id: "d15", source: "cutoff_energy", target: "scf_convergence" },
  // Intermediate → Outputs
  { id: "d16", source: "electron_density", target: "total_energy" },
  { id: "d17", source: "electron_density", target: "atomic_forces" },
  { id: "d18", source: "electron_density", target: "stress_tensor" },
  { id: "d19", source: "band_structure", target: "total_energy" },
  { id: "d20", source: "scf_convergence", target: "total_energy" },
  { id: "d21", source: "scf_convergence", target: "atomic_forces" },
  { id: "d22", source: "scf_convergence", target: "stress_tensor" },
  // Cross-connections
  { id: "d23", source: "xc_functional", target: "band_structure" },
  { id: "d24", source: "spin_polarization", target: "electron_density" }
];

// ============ EXPORT PRESETS ============
export interface ExperimentPreset {
  id: string;
  name: string;
  description: string;
  graph: CausalGraph;
}

export const experimentPresets: ExperimentPreset[] = [
  {
    id: 'battery',
    name: 'Battery Cycling',
    description: 'Lithium-ion coin cell capacity fade',
    graph: {
      nodes: batteryNodes,
      edges: batteryEdges,
      experimentalContext: batteryContext
    }
  },
  {
    id: 'dft',
    name: 'DFT Calculation',
    description: 'Density functional theory for materials',
    graph: {
      nodes: dftNodes,
      edges: dftEdges,
      experimentalContext: dftContext
    }
  },
  {
    id: 'rde',
    name: 'RDE Catalysis',
    description: 'Rotating disc electrode oxygen reduction',
    graph: {
      nodes: rdeNodes,
      edges: rdeEdges,
      experimentalContext: rdeContext
    }
  },
  {
    id: 'enzyme',
    name: 'Enzyme Kinetics',
    description: 'Microplate enzyme activity assay',
    graph: {
      nodes: enzymeNodes,
      edges: enzymeEdges,
      experimentalContext: enzymeContext
    }
  }
];

// Default export - Battery Cycling is now the default
export const initialGraph: CausalGraph = experimentPresets[0].graph;
export const experimentalContext = batteryContext;
export const initialNodes = batteryNodes;
export const initialEdges = batteryEdges;
