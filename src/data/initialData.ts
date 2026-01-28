import type { CausalNode, CausalEdge, CausalGraph, WhyzenMetadata } from '../types';
import rdeWhyzenRaw from './rde_graph.json';
import drxGraphRaw from './drx_graph.json';

// Helper to convert snake_case to Title Case
function snakeToTitle(name: string): string {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// ============ PRESET 0: Whyzen RDE Model (Full) ============
// Imported from Whyzen-RDE structural causal model
const whyzenRdeNodes: CausalNode[] = rdeWhyzenRaw.nodes.map((n: {
  id: string;
  variableName: string;
  displayName: string;
  description: string;
  position: { x: number; y: number };
  _whyzen?: WhyzenMetadata;
}) => ({
  ...n,
  // Fix broken display names (HTML parsing artifacts like "ref>")
  displayName: n.displayName && !n.displayName.includes('>') && n.displayName.length > 0
    ? n.displayName
    : snakeToTitle(n.variableName),
}));

const whyzenRdeEdges: CausalEdge[] = rdeWhyzenRaw.edges.map((e: {
  id: string;
  source: string;
  target: string;
}) => ({
  id: e.id,
  source: e.source,
  target: e.target,
}));

const whyzenRdeContext = rdeWhyzenRaw.experimentalContext || `This causal model represents a Rotating Disk Electrode (RDE) experiment for the Oxygen Reduction Reaction (ORR). It was imported from a Whyzen structural causal model with ${whyzenRdeNodes.length} nodes and ${whyzenRdeEdges.length} edges. The model captures relationships between catalyst properties, electrode construction, electrochemical kinetics, and mass transport.`;

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

// ============ PRESET 5: Cathode Synthesis → Coin Cell ============
const cathodeSynthContext = `This causal model represents the complete workflow from cathode active material (CAM) synthesis through coin cell fabrication and cycling. It focuses on NMC (LiNixMnyCo1-x-yO2) cathode materials synthesized via coprecipitation and solid-state calcination. Key variables span precursor chemistry, hydroxide coprecipitation, lithiation calcination, post-treatment, electrode fabrication, and electrochemical testing. The goal is to understand how synthesis parameters propagate through material properties to affect final cell performance.`;

const cathodeSynthNodes: CausalNode[] = [
  // ===== TIER 0: Precursor Chemistry (y: -100) =====
  {
    id: "ni_mn_co_ratio",
    variableName: "ni_mn_co_ratio",
    displayName: "Ni:Mn:Co Ratio",
    description: "Stoichiometric ratio of transition metals in the precursor solution (e.g., 8:1:1 for NMC811)",
    position: { x: 50, y: -100 }
  },
  {
    id: "metal_salt_concentration",
    variableName: "metal_salt_concentration",
    displayName: "Metal Salt Concentration",
    description: "Total transition metal concentration in feed solution (mol/L)",
    position: { x: 200, y: -100 }
  },
  {
    id: "precursor_purity",
    variableName: "precursor_purity",
    displayName: "Precursor Purity",
    description: "Purity of metal sulfate/nitrate precursors (%)",
    position: { x: 350, y: -100 }
  },
  {
    id: "dopant_type",
    variableName: "dopant_type",
    displayName: "Dopant Type",
    description: "Bulk dopant element (Al, Mg, Ti, Zr, W, etc.) or none",
    position: { x: 500, y: -100 }
  },
  {
    id: "dopant_concentration",
    variableName: "dopant_concentration",
    displayName: "Dopant Concentration",
    description: "Dopant level in mol% relative to total TM content",
    position: { x: 650, y: -100 }
  },

  // ===== TIER 1: Coprecipitation (y: 0) =====
  {
    id: "coprecip_ph",
    variableName: "coprecip_ph",
    displayName: "Coprecipitation pH",
    description: "pH maintained during hydroxide coprecipitation (typically 10.5-12)",
    position: { x: 50, y: 0 }
  },
  {
    id: "coprecip_temperature",
    variableName: "coprecip_temperature",
    displayName: "Coprecipitation Temp",
    description: "Reactor temperature during coprecipitation (°C)",
    position: { x: 200, y: 0 }
  },
  {
    id: "ammonia_concentration",
    variableName: "ammonia_concentration",
    displayName: "NH₃ Concentration",
    description: "Ammonia complexing agent concentration in reactor (mol/L)",
    position: { x: 350, y: 0 }
  },
  {
    id: "stirring_rate",
    variableName: "stirring_rate",
    displayName: "Stirring Rate",
    description: "Impeller rotation speed during coprecipitation (rpm)",
    position: { x: 500, y: 0 }
  },
  {
    id: "feed_rate",
    variableName: "feed_rate",
    displayName: "Feed Rate",
    description: "Metal solution feed rate into reactor (mL/min)",
    position: { x: 650, y: 0 }
  },
  {
    id: "residence_time",
    variableName: "residence_time",
    displayName: "Residence Time",
    description: "Average particle residence time in CSTR (hours)",
    position: { x: 800, y: 0 }
  },

  // ===== TIER 2: Precursor Properties (y: 100) =====
  {
    id: "precursor_particle_size",
    variableName: "precursor_particle_size",
    displayName: "Precursor D50",
    description: "Median diameter of hydroxide precursor particles (µm)",
    position: { x: 100, y: 100 }
  },
  {
    id: "precursor_morphology",
    variableName: "precursor_morphology",
    displayName: "Precursor Morphology",
    description: "Hydroxide particle shape (spherical, irregular, aggregated)",
    position: { x: 300, y: 100 }
  },
  {
    id: "precursor_tap_density",
    variableName: "precursor_tap_density",
    displayName: "Precursor Tap Density",
    description: "Tap density of hydroxide precursor powder (g/cm³)",
    position: { x: 500, y: 100 }
  },
  {
    id: "tm_homogeneity",
    variableName: "tm_homogeneity",
    displayName: "TM Homogeneity",
    description: "Uniformity of Ni/Mn/Co distribution within precursor particles",
    position: { x: 700, y: 100 }
  },

  // ===== TIER 3: Lithiation & Calcination (y: 200) =====
  {
    id: "li_tm_ratio",
    variableName: "li_tm_ratio",
    displayName: "Li:TM Ratio",
    description: "Lithium to transition metal molar ratio for lithiation (typically 1.01-1.08)",
    position: { x: 50, y: 200 }
  },
  {
    id: "li_source",
    variableName: "li_source",
    displayName: "Lithium Source",
    description: "Lithium precursor compound (LiOH·H₂O, Li₂CO₃)",
    position: { x: 200, y: 200 }
  },
  {
    id: "calcination_temp",
    variableName: "calcination_temp",
    displayName: "Calcination Temperature",
    description: "Peak temperature for solid-state lithiation (°C)",
    position: { x: 350, y: 200 }
  },
  {
    id: "calcination_time",
    variableName: "calcination_time",
    displayName: "Calcination Time",
    description: "Duration at peak calcination temperature (hours)",
    position: { x: 500, y: 200 }
  },
  {
    id: "heating_rate",
    variableName: "heating_rate",
    displayName: "Heating Rate",
    description: "Ramp rate to calcination temperature (°C/min)",
    position: { x: 650, y: 200 }
  },
  {
    id: "calcination_atmosphere",
    variableName: "calcination_atmosphere",
    displayName: "Calcination Atmosphere",
    description: "Gas atmosphere during calcination (O₂, air, O₂ flow rate)",
    position: { x: 800, y: 200 }
  },
  {
    id: "cooling_rate",
    variableName: "cooling_rate",
    displayName: "Cooling Rate",
    description: "Cooling rate from calcination temperature (°C/min)",
    position: { x: 950, y: 200 }
  },

  // ===== TIER 4: CAM Structural Properties (y: 300) =====
  {
    id: "crystal_structure",
    variableName: "crystal_structure",
    displayName: "Crystal Structure",
    description: "Layered oxide phase (R-3m) with lattice parameters a, c",
    position: { x: 50, y: 300 }
  },
  {
    id: "cation_mixing",
    variableName: "cation_mixing",
    displayName: "Cation Mixing",
    description: "Degree of Li/Ni site exchange in the layered structure (%)",
    position: { x: 200, y: 300 }
  },
  {
    id: "phase_purity",
    variableName: "phase_purity",
    displayName: "Phase Purity",
    description: "Absence of impurity phases (Li₂CO₃, NiO, spinel)",
    position: { x: 350, y: 300 }
  },
  {
    id: "primary_particle_size",
    variableName: "primary_particle_size",
    displayName: "Primary Particle Size",
    description: "Size of crystalline grains within secondary particles (nm)",
    position: { x: 500, y: 300 }
  },
  {
    id: "secondary_particle_size",
    variableName: "secondary_particle_size",
    displayName: "Secondary Particle Size",
    description: "Size of agglomerated CAM particles D50 (µm)",
    position: { x: 650, y: 300 }
  },
  {
    id: "cam_tap_density",
    variableName: "cam_tap_density",
    displayName: "CAM Tap Density",
    description: "Tap density of final cathode active material (g/cm³)",
    position: { x: 800, y: 300 }
  },
  {
    id: "bet_surface_area",
    variableName: "bet_surface_area",
    displayName: "BET Surface Area",
    description: "Specific surface area of CAM powder (m²/g)",
    position: { x: 950, y: 300 }
  },

  // ===== TIER 5: Surface & Post-treatment (y: 400) =====
  {
    id: "surface_residual_li",
    variableName: "surface_residual_li",
    displayName: "Residual Li",
    description: "Surface lithium carbonate/hydroxide content (wt%)",
    position: { x: 100, y: 400 }
  },
  {
    id: "washing_treatment",
    variableName: "washing_treatment",
    displayName: "Washing Treatment",
    description: "Post-calcination water washing to remove residual Li",
    position: { x: 300, y: 400 }
  },
  {
    id: "surface_coating",
    variableName: "surface_coating",
    displayName: "Surface Coating",
    description: "Protective coating material (Al₂O₃, ZrO₂, LiNbO₃, etc.)",
    position: { x: 500, y: 400 }
  },
  {
    id: "coating_thickness",
    variableName: "coating_thickness",
    displayName: "Coating Thickness",
    description: "Surface coating layer thickness (nm)",
    position: { x: 700, y: 400 }
  },
  {
    id: "post_anneal_temp",
    variableName: "post_anneal_temp",
    displayName: "Post-Anneal Temp",
    description: "Re-annealing temperature after coating (°C)",
    position: { x: 900, y: 400 }
  },

  // ===== TIER 6: Electrode Fabrication (y: 500) =====
  {
    id: "active_material_content",
    variableName: "active_material_content",
    displayName: "AM Content",
    description: "Weight fraction of CAM in electrode formulation (%)",
    position: { x: 50, y: 500 }
  },
  {
    id: "conductive_additive",
    variableName: "conductive_additive",
    displayName: "Conductive Additive",
    description: "Carbon additive type and content (Super P, CNT, graphene)",
    position: { x: 200, y: 500 }
  },
  {
    id: "binder_type",
    variableName: "binder_type",
    displayName: "Binder Type",
    description: "Polymeric binder (PVDF, CMC/SBR) and molecular weight",
    position: { x: 350, y: 500 }
  },
  {
    id: "slurry_solid_content",
    variableName: "slurry_solid_content",
    displayName: "Slurry Solid Content",
    description: "Total solids loading in electrode slurry (wt%)",
    position: { x: 500, y: 500 }
  },
  {
    id: "mixing_protocol",
    variableName: "mixing_protocol",
    displayName: "Mixing Protocol",
    description: "Slurry mixing sequence, speed, and duration",
    position: { x: 650, y: 500 }
  },
  {
    id: "coating_thickness",
    variableName: "electrode_coating_thickness",
    displayName: "Coating Thickness",
    description: "Wet coating thickness on Al foil (µm)",
    position: { x: 800, y: 500 }
  },
  {
    id: "drying_profile",
    variableName: "drying_profile",
    displayName: "Drying Profile",
    description: "Electrode drying temperature and time profile",
    position: { x: 950, y: 500 }
  },

  // ===== TIER 7: Electrode Properties (y: 600) =====
  {
    id: "electrode_density",
    variableName: "electrode_density",
    displayName: "Electrode Density",
    description: "Calendered electrode density (g/cm³)",
    position: { x: 100, y: 600 }
  },
  {
    id: "electrode_porosity",
    variableName: "electrode_porosity",
    displayName: "Electrode Porosity",
    description: "Void fraction in calendered electrode (%)",
    position: { x: 300, y: 600 }
  },
  {
    id: "areal_loading",
    variableName: "areal_loading",
    displayName: "Areal Loading",
    description: "Active material mass per unit area (mg/cm²)",
    position: { x: 500, y: 600 }
  },
  {
    id: "electronic_conductivity",
    variableName: "electronic_conductivity",
    displayName: "Electronic Conductivity",
    description: "Through-plane electronic conductivity of electrode (S/cm)",
    position: { x: 700, y: 600 }
  },
  {
    id: "adhesion_strength",
    variableName: "adhesion_strength",
    displayName: "Adhesion Strength",
    description: "Electrode coating adhesion to current collector (N/m)",
    position: { x: 900, y: 600 }
  },

  // ===== TIER 8: Cell Assembly (y: 700) =====
  {
    id: "electrolyte_composition",
    variableName: "electrolyte_composition",
    displayName: "Electrolyte Composition",
    description: "Electrolyte salt and solvent (e.g., 1M LiPF₆ in EC:DMC)",
    position: { x: 100, y: 700 }
  },
  {
    id: "electrolyte_additives",
    variableName: "electrolyte_additives",
    displayName: "Electrolyte Additives",
    description: "Functional additives (VC, FEC, LiBOB, etc.)",
    position: { x: 300, y: 700 }
  },
  {
    id: "electrolyte_amount",
    variableName: "electrolyte_amount",
    displayName: "Electrolyte Amount",
    description: "Volume of electrolyte added to coin cell (µL)",
    position: { x: 500, y: 700 }
  },
  {
    id: "separator_type",
    variableName: "separator_type",
    displayName: "Separator Type",
    description: "Separator material and thickness (Celgard PP, ceramic-coated)",
    position: { x: 700, y: 700 }
  },
  {
    id: "cell_pressure",
    variableName: "cell_pressure",
    displayName: "Cell Pressure",
    description: "Stack pressure in assembled coin cell (psi)",
    position: { x: 900, y: 700 }
  },

  // ===== TIER 9: Electrochemical Testing (y: 800) =====
  {
    id: "formation_protocol",
    variableName: "formation_protocol",
    displayName: "Formation Protocol",
    description: "Initial cycling protocol for SEI/CEI formation (C-rate, cycles)",
    position: { x: 100, y: 800 }
  },
  {
    id: "cycling_voltage_window",
    variableName: "cycling_voltage_window",
    displayName: "Voltage Window",
    description: "Charge/discharge voltage limits (e.g., 3.0-4.3V)",
    position: { x: 300, y: 800 }
  },
  {
    id: "cycling_rate",
    variableName: "cycling_rate",
    displayName: "Cycling Rate",
    description: "C-rate for long-term cycling (e.g., C/3, 1C)",
    position: { x: 500, y: 800 }
  },
  {
    id: "cycling_temperature",
    variableName: "cycling_temperature",
    displayName: "Cycling Temperature",
    description: "Environmental temperature during cycling (°C)",
    position: { x: 700, y: 800 }
  },

  // ===== TIER 10: Performance Outputs (y: 900) =====
  {
    id: "initial_capacity",
    variableName: "initial_capacity",
    displayName: "Initial Capacity",
    description: "First-cycle discharge capacity (mAh/g)",
    position: { x: 100, y: 900 }
  },
  {
    id: "first_cycle_efficiency",
    variableName: "first_cycle_efficiency",
    displayName: "First Cycle Efficiency",
    description: "Coulombic efficiency of first cycle (%)",
    position: { x: 300, y: 900 }
  },
  {
    id: "rate_capability",
    variableName: "rate_capability",
    displayName: "Rate Capability",
    description: "Capacity retention at high C-rates vs C/10 (%)",
    position: { x: 500, y: 900 }
  },
  {
    id: "capacity_retention",
    variableName: "capacity_retention",
    displayName: "Capacity Retention",
    description: "Fraction of initial capacity after N cycles (%)",
    position: { x: 700, y: 900 }
  },
  {
    id: "voltage_fade",
    variableName: "voltage_fade",
    displayName: "Voltage Fade",
    description: "Average voltage decrease over cycling (mV/cycle)",
    position: { x: 900, y: 900 }
  },
  {
    id: "impedance_growth",
    variableName: "impedance_growth",
    displayName: "Impedance Growth",
    description: "Increase in cell resistance over cycling (Ω)",
    position: { x: 1050, y: 900 }
  }
];

const cathodeSynthEdges: CausalEdge[] = [
  // Precursor Chemistry → Coprecipitation
  { id: "cs1", source: "ni_mn_co_ratio", target: "tm_homogeneity" },
  { id: "cs2", source: "metal_salt_concentration", target: "feed_rate" },
  { id: "cs3", source: "precursor_purity", target: "phase_purity" },
  { id: "cs4", source: "dopant_type", target: "crystal_structure" },
  { id: "cs5", source: "dopant_concentration", target: "cation_mixing" },

  // Coprecipitation → Precursor Properties
  { id: "cs6", source: "coprecip_ph", target: "precursor_particle_size" },
  { id: "cs7", source: "coprecip_ph", target: "precursor_morphology" },
  { id: "cs8", source: "coprecip_temperature", target: "precursor_particle_size" },
  { id: "cs9", source: "ammonia_concentration", target: "precursor_morphology" },
  { id: "cs10", source: "ammonia_concentration", target: "tm_homogeneity" },
  { id: "cs11", source: "stirring_rate", target: "precursor_particle_size" },
  { id: "cs12", source: "stirring_rate", target: "precursor_morphology" },
  { id: "cs13", source: "feed_rate", target: "precursor_particle_size" },
  { id: "cs14", source: "residence_time", target: "precursor_particle_size" },
  { id: "cs15", source: "residence_time", target: "precursor_tap_density" },

  // Precursor Properties → CAM Structural
  { id: "cs16", source: "precursor_particle_size", target: "secondary_particle_size" },
  { id: "cs17", source: "precursor_morphology", target: "secondary_particle_size" },
  { id: "cs18", source: "precursor_tap_density", target: "cam_tap_density" },
  { id: "cs19", source: "tm_homogeneity", target: "cation_mixing" },
  { id: "cs20", source: "tm_homogeneity", target: "phase_purity" },

  // Lithiation & Calcination → CAM Structural
  { id: "cs21", source: "li_tm_ratio", target: "surface_residual_li" },
  { id: "cs22", source: "li_tm_ratio", target: "cation_mixing" },
  { id: "cs23", source: "li_source", target: "phase_purity" },
  { id: "cs24", source: "calcination_temp", target: "crystal_structure" },
  { id: "cs25", source: "calcination_temp", target: "primary_particle_size" },
  { id: "cs26", source: "calcination_temp", target: "cation_mixing" },
  { id: "cs27", source: "calcination_time", target: "primary_particle_size" },
  { id: "cs28", source: "calcination_time", target: "phase_purity" },
  { id: "cs29", source: "heating_rate", target: "primary_particle_size" },
  { id: "cs30", source: "calcination_atmosphere", target: "cation_mixing" },
  { id: "cs31", source: "calcination_atmosphere", target: "phase_purity" },
  { id: "cs32", source: "cooling_rate", target: "crystal_structure" },

  // CAM Structural → Surface/BET
  { id: "cs33", source: "primary_particle_size", target: "bet_surface_area" },
  { id: "cs34", source: "secondary_particle_size", target: "bet_surface_area" },
  { id: "cs35", source: "secondary_particle_size", target: "cam_tap_density" },

  // Surface & Post-treatment edges
  { id: "cs36", source: "washing_treatment", target: "surface_residual_li" },
  { id: "cs37", source: "surface_coating", target: "coating_thickness" },
  { id: "cs38", source: "post_anneal_temp", target: "coating_thickness" },

  // Electrode Fabrication → Electrode Properties
  { id: "cs39", source: "active_material_content", target: "electrode_density" },
  { id: "cs40", source: "conductive_additive", target: "electronic_conductivity" },
  { id: "cs41", source: "binder_type", target: "adhesion_strength" },
  { id: "cs42", source: "slurry_solid_content", target: "electrode_porosity" },
  { id: "cs43", source: "mixing_protocol", target: "electronic_conductivity" },
  { id: "cs44", source: "drying_profile", target: "adhesion_strength" },
  { id: "cs45", source: "drying_profile", target: "electrode_porosity" },

  // CAM Properties → Electrode Properties
  { id: "cs46", source: "cam_tap_density", target: "electrode_density" },
  { id: "cs47", source: "bet_surface_area", target: "electrode_porosity" },
  { id: "cs48", source: "secondary_particle_size", target: "areal_loading" },

  // Electrode Properties cross-links
  { id: "cs49", source: "electrode_density", target: "electrode_porosity" },
  { id: "cs50", source: "electrode_porosity", target: "electronic_conductivity" },

  // Cell Assembly → Performance
  { id: "cs51", source: "electrolyte_composition", target: "first_cycle_efficiency" },
  { id: "cs52", source: "electrolyte_additives", target: "capacity_retention" },
  { id: "cs53", source: "electrolyte_amount", target: "capacity_retention" },
  { id: "cs54", source: "separator_type", target: "impedance_growth" },
  { id: "cs55", source: "cell_pressure", target: "impedance_growth" },

  // Testing Conditions → Performance
  { id: "cs56", source: "formation_protocol", target: "first_cycle_efficiency" },
  { id: "cs57", source: "cycling_voltage_window", target: "initial_capacity" },
  { id: "cs58", source: "cycling_voltage_window", target: "capacity_retention" },
  { id: "cs59", source: "cycling_rate", target: "capacity_retention" },
  { id: "cs60", source: "cycling_temperature", target: "capacity_retention" },

  // CAM Properties → Electrochemical Performance
  { id: "cs61", source: "crystal_structure", target: "initial_capacity" },
  { id: "cs62", source: "cation_mixing", target: "initial_capacity" },
  { id: "cs63", source: "cation_mixing", target: "rate_capability" },
  { id: "cs64", source: "phase_purity", target: "first_cycle_efficiency" },
  { id: "cs65", source: "primary_particle_size", target: "rate_capability" },
  { id: "cs66", source: "bet_surface_area", target: "first_cycle_efficiency" },
  { id: "cs67", source: "surface_residual_li", target: "first_cycle_efficiency" },
  { id: "cs68", source: "surface_residual_li", target: "impedance_growth" },
  { id: "cs69", source: "coating_thickness", target: "capacity_retention" },
  { id: "cs70", source: "coating_thickness", target: "voltage_fade" },

  // Electrode Properties → Electrochemical Performance
  { id: "cs71", source: "electrode_density", target: "rate_capability" },
  { id: "cs72", source: "electrode_porosity", target: "rate_capability" },
  { id: "cs73", source: "areal_loading", target: "rate_capability" },
  { id: "cs74", source: "electronic_conductivity", target: "rate_capability" },
  { id: "cs75", source: "adhesion_strength", target: "capacity_retention" },

  // Performance cross-links
  { id: "cs76", source: "initial_capacity", target: "capacity_retention" },
  { id: "cs77", source: "impedance_growth", target: "voltage_fade" },
  { id: "cs78", source: "impedance_growth", target: "capacity_retention" }
];

// ============ PRESET 6: MONSTER Battery Graph ============
const monsterBatteryContext = `This comprehensive causal model captures the COMPLETE battery development workflow from raw material synthesis through cell performance. It includes: (1) Cathode active material synthesis via coprecipitation and calcination, (2) Anode material preparation including graphite and silicon components, (3) Electrolyte formulation with solvents, salts, and additives, (4) Separator selection and properties, (5) Electrode fabrication for both cathode and anode, (6) Cell assembly in coin cell format, (7) Formation cycling protocol, (8) Long-term cycling and performance metrics. This is the most detailed battery causal model available, capturing over 100 variables across the entire workflow.`;

const monsterBatteryNodes: CausalNode[] = [
  // ===== CATHODE ACTIVE MATERIAL SYNTHESIS (y: -200 to 0) =====
  // Precursors
  { id: "cam_ni_content", variableName: "cam_ni_content", displayName: "CAM Ni Content", description: "Nickel fraction in NMC composition (0-1)", position: { x: 0, y: -200 } },
  { id: "cam_mn_content", variableName: "cam_mn_content", displayName: "CAM Mn Content", description: "Manganese fraction in NMC composition (0-1)", position: { x: 150, y: -200 } },
  { id: "cam_co_content", variableName: "cam_co_content", displayName: "CAM Co Content", description: "Cobalt fraction in NMC composition (0-1)", position: { x: 300, y: -200 } },
  { id: "cam_dopant", variableName: "cam_dopant", displayName: "CAM Dopant", description: "Bulk dopant element (Al, Mg, Ti, Zr, W, B)", position: { x: 450, y: -200 } },
  { id: "cam_dopant_level", variableName: "cam_dopant_level", displayName: "Dopant Level", description: "Dopant concentration (mol%)", position: { x: 600, y: -200 } },

  // Coprecipitation
  { id: "cam_coprecip_ph", variableName: "cam_coprecip_ph", displayName: "Coprecip pH", description: "pH during hydroxide coprecipitation", position: { x: 0, y: -100 } },
  { id: "cam_coprecip_temp", variableName: "cam_coprecip_temp", displayName: "Coprecip Temp", description: "Reactor temperature (°C)", position: { x: 150, y: -100 } },
  { id: "cam_nh3_conc", variableName: "cam_nh3_conc", displayName: "NH₃ Concentration", description: "Ammonia complexing agent (mol/L)", position: { x: 300, y: -100 } },
  { id: "cam_stirring", variableName: "cam_stirring", displayName: "Stirring Rate", description: "Impeller speed (rpm)", position: { x: 450, y: -100 } },
  { id: "cam_residence", variableName: "cam_residence", displayName: "Residence Time", description: "CSTR residence time (hours)", position: { x: 600, y: -100 } },

  // Calcination
  { id: "cam_li_ratio", variableName: "cam_li_ratio", displayName: "Li:TM Ratio", description: "Lithium to transition metal ratio", position: { x: 0, y: 0 } },
  { id: "cam_calc_temp", variableName: "cam_calc_temp", displayName: "Calcination Temp", description: "Peak calcination temperature (°C)", position: { x: 150, y: 0 } },
  { id: "cam_calc_time", variableName: "cam_calc_time", displayName: "Calcination Time", description: "Time at peak temperature (hours)", position: { x: 300, y: 0 } },
  { id: "cam_calc_atm", variableName: "cam_calc_atm", displayName: "Calcination Atm", description: "Oxygen partial pressure / flow", position: { x: 450, y: 0 } },
  { id: "cam_cooling", variableName: "cam_cooling", displayName: "Cooling Rate", description: "Cooling rate (°C/min)", position: { x: 600, y: 0 } },

  // CAM Properties
  { id: "cam_structure", variableName: "cam_structure", displayName: "CAM Structure", description: "Crystal structure and lattice parameters", position: { x: 0, y: 100 } },
  { id: "cam_cation_mix", variableName: "cam_cation_mix", displayName: "Cation Mixing", description: "Li/Ni site exchange degree (%)", position: { x: 150, y: 100 } },
  { id: "cam_primary_size", variableName: "cam_primary_size", displayName: "Primary Size", description: "Primary crystallite size (nm)", position: { x: 300, y: 100 } },
  { id: "cam_secondary_size", variableName: "cam_secondary_size", displayName: "Secondary Size", description: "Secondary particle D50 (µm)", position: { x: 450, y: 100 } },
  { id: "cam_surface_area", variableName: "cam_surface_area", displayName: "CAM BET Area", description: "Specific surface area (m²/g)", position: { x: 600, y: 100 } },
  { id: "cam_tap_density", variableName: "cam_tap_density", displayName: "CAM Tap Density", description: "Powder tap density (g/cm³)", position: { x: 750, y: 100 } },
  { id: "cam_residual_li", variableName: "cam_residual_li", displayName: "Residual Li", description: "Surface Li₂CO₃/LiOH content (wt%)", position: { x: 900, y: 100 } },

  // CAM Surface Treatment
  { id: "cam_coating_type", variableName: "cam_coating_type", displayName: "Coating Type", description: "Surface coating material (Al₂O₃, etc.)", position: { x: 750, y: 0 } },
  { id: "cam_coating_amount", variableName: "cam_coating_amount", displayName: "Coating Amount", description: "Coating loading (wt%)", position: { x: 900, y: 0 } },
  { id: "cam_coating_thickness", variableName: "cam_coating_thickness", displayName: "Coating Thickness", description: "Coating layer thickness (nm)", position: { x: 750, y: 100 } },

  // ===== ANODE MATERIAL (y: 200) =====
  { id: "graphite_type", variableName: "graphite_type", displayName: "Graphite Type", description: "Natural vs synthetic graphite", position: { x: 0, y: 200 } },
  { id: "graphite_particle_size", variableName: "graphite_particle_size", displayName: "Graphite D50", description: "Graphite particle size (µm)", position: { x: 150, y: 200 } },
  { id: "graphite_surface_area", variableName: "graphite_surface_area", displayName: "Graphite BET", description: "Graphite surface area (m²/g)", position: { x: 300, y: 200 } },
  { id: "graphite_coating", variableName: "graphite_coating", displayName: "Graphite Coating", description: "Carbon coating on graphite", position: { x: 450, y: 200 } },
  { id: "silicon_content", variableName: "silicon_content", displayName: "Si Content", description: "Silicon additive content (wt%)", position: { x: 600, y: 200 } },
  { id: "silicon_particle_size", variableName: "silicon_particle_size", displayName: "Si Particle Size", description: "Silicon nanoparticle size (nm)", position: { x: 750, y: 200 } },
  { id: "silicon_type", variableName: "silicon_type", displayName: "Si Type", description: "Si type (SiO, SiOx, Si/C composite)", position: { x: 900, y: 200 } },

  // ===== ELECTROLYTE (y: 300) =====
  { id: "salt_type", variableName: "salt_type", displayName: "Li Salt Type", description: "Lithium salt (LiPF₆, LiFSI, LiTFSI)", position: { x: 0, y: 300 } },
  { id: "salt_concentration", variableName: "salt_concentration", displayName: "Salt Concentration", description: "Lithium salt molarity (M)", position: { x: 150, y: 300 } },
  { id: "solvent_ec_content", variableName: "solvent_ec_content", displayName: "EC Content", description: "Ethylene carbonate fraction (vol%)", position: { x: 300, y: 300 } },
  { id: "solvent_dmc_content", variableName: "solvent_dmc_content", displayName: "DMC Content", description: "Dimethyl carbonate fraction (vol%)", position: { x: 450, y: 300 } },
  { id: "solvent_emc_content", variableName: "solvent_emc_content", displayName: "EMC Content", description: "Ethyl methyl carbonate fraction (vol%)", position: { x: 600, y: 300 } },
  { id: "additive_vc", variableName: "additive_vc", displayName: "VC Content", description: "Vinylene carbonate additive (wt%)", position: { x: 750, y: 300 } },
  { id: "additive_fec", variableName: "additive_fec", displayName: "FEC Content", description: "Fluoroethylene carbonate additive (wt%)", position: { x: 900, y: 300 } },
  { id: "additive_other", variableName: "additive_other", displayName: "Other Additives", description: "Additional additives (LiBOB, PS, etc.)", position: { x: 1050, y: 300 } },
  { id: "electrolyte_conductivity", variableName: "electrolyte_conductivity", displayName: "Elyte Conductivity", description: "Ionic conductivity (mS/cm)", position: { x: 450, y: 400 } },
  { id: "electrolyte_viscosity", variableName: "electrolyte_viscosity", displayName: "Elyte Viscosity", description: "Electrolyte viscosity (cP)", position: { x: 600, y: 400 } },

  // ===== SEPARATOR (y: 350) =====
  { id: "separator_material", variableName: "separator_material", displayName: "Separator Material", description: "Base material (PP, PE, PP/PE/PP)", position: { x: 0, y: 350 } },
  { id: "separator_thickness", variableName: "separator_thickness", displayName: "Separator Thickness", description: "Separator thickness (µm)", position: { x: 150, y: 350 } },
  { id: "separator_porosity", variableName: "separator_porosity", displayName: "Separator Porosity", description: "Void fraction (%)", position: { x: 300, y: 350 } },
  { id: "separator_coating", variableName: "separator_coating", displayName: "Separator Coating", description: "Ceramic coating (Al₂O₃, boehmite)", position: { x: 450, y: 350 } },
  { id: "separator_wettability", variableName: "separator_wettability", displayName: "Wettability", description: "Electrolyte wetting behavior", position: { x: 600, y: 350 } },

  // ===== CATHODE ELECTRODE FABRICATION (y: 450-550) =====
  { id: "cathode_am_content", variableName: "cathode_am_content", displayName: "Cathode AM%", description: "Active material weight fraction (%)", position: { x: 0, y: 450 } },
  { id: "cathode_carbon_type", variableName: "cathode_carbon_type", displayName: "Cathode Carbon", description: "Conductive carbon type", position: { x: 150, y: 450 } },
  { id: "cathode_carbon_content", variableName: "cathode_carbon_content", displayName: "Cathode C%", description: "Carbon additive content (%)", position: { x: 300, y: 450 } },
  { id: "cathode_binder_type", variableName: "cathode_binder_type", displayName: "Cathode Binder", description: "Binder type (PVDF grade)", position: { x: 450, y: 450 } },
  { id: "cathode_binder_content", variableName: "cathode_binder_content", displayName: "Cathode Binder%", description: "Binder content (%)", position: { x: 600, y: 450 } },
  { id: "cathode_nmp_content", variableName: "cathode_nmp_content", displayName: "Cathode NMP", description: "NMP solvent content in slurry", position: { x: 750, y: 450 } },
  { id: "cathode_mixing_speed", variableName: "cathode_mixing_speed", displayName: "Cathode Mix Speed", description: "Slurry mixing speed (rpm)", position: { x: 900, y: 450 } },
  { id: "cathode_mixing_time", variableName: "cathode_mixing_time", displayName: "Cathode Mix Time", description: "Total mixing duration (min)", position: { x: 1050, y: 450 } },

  { id: "cathode_coat_speed", variableName: "cathode_coat_speed", displayName: "Coating Speed", description: "Coating line speed (m/min)", position: { x: 0, y: 500 } },
  { id: "cathode_wet_thickness", variableName: "cathode_wet_thickness", displayName: "Wet Thickness", description: "Wet coating thickness (µm)", position: { x: 150, y: 500 } },
  { id: "cathode_dry_temp", variableName: "cathode_dry_temp", displayName: "Drying Temp", description: "Electrode drying temperature (°C)", position: { x: 300, y: 500 } },
  { id: "cathode_calender_pressure", variableName: "cathode_calender_pressure", displayName: "Calender Pressure", description: "Calendering pressure (MPa)", position: { x: 450, y: 500 } },
  { id: "cathode_calender_temp", variableName: "cathode_calender_temp", displayName: "Calender Temp", description: "Calendering temperature (°C)", position: { x: 600, y: 500 } },

  { id: "cathode_loading", variableName: "cathode_loading", displayName: "Cathode Loading", description: "Areal capacity loading (mAh/cm²)", position: { x: 0, y: 550 } },
  { id: "cathode_density", variableName: "cathode_density", displayName: "Cathode Density", description: "Electrode density (g/cm³)", position: { x: 150, y: 550 } },
  { id: "cathode_porosity", variableName: "cathode_porosity", displayName: "Cathode Porosity", description: "Electrode void fraction (%)", position: { x: 300, y: 550 } },
  { id: "cathode_thickness", variableName: "cathode_thickness", displayName: "Cathode Thickness", description: "Final coating thickness (µm)", position: { x: 450, y: 550 } },
  { id: "cathode_conductivity", variableName: "cathode_conductivity", displayName: "Cathode σ", description: "Electronic conductivity (S/cm)", position: { x: 600, y: 550 } },
  { id: "cathode_adhesion", variableName: "cathode_adhesion", displayName: "Cathode Adhesion", description: "Coating-foil adhesion (N/m)", position: { x: 750, y: 550 } },
  { id: "cathode_tortuosity", variableName: "cathode_tortuosity", displayName: "Cathode τ", description: "Electrode tortuosity factor", position: { x: 900, y: 550 } },

  // ===== ANODE ELECTRODE FABRICATION (y: 600-700) =====
  { id: "anode_am_content", variableName: "anode_am_content", displayName: "Anode AM%", description: "Active material weight fraction (%)", position: { x: 0, y: 600 } },
  { id: "anode_carbon_type", variableName: "anode_carbon_type", displayName: "Anode Carbon", description: "Conductive carbon type", position: { x: 150, y: 600 } },
  { id: "anode_carbon_content", variableName: "anode_carbon_content", displayName: "Anode C%", description: "Carbon additive content (%)", position: { x: 300, y: 600 } },
  { id: "anode_binder_type", variableName: "anode_binder_type", displayName: "Anode Binder", description: "Binder system (CMC/SBR, PAA)", position: { x: 450, y: 600 } },
  { id: "anode_binder_content", variableName: "anode_binder_content", displayName: "Anode Binder%", description: "Total binder content (%)", position: { x: 600, y: 600 } },
  { id: "anode_mixing_speed", variableName: "anode_mixing_speed", displayName: "Anode Mix Speed", description: "Slurry mixing speed (rpm)", position: { x: 750, y: 600 } },

  { id: "anode_coat_speed", variableName: "anode_coat_speed", displayName: "Anode Coat Speed", description: "Coating line speed (m/min)", position: { x: 0, y: 650 } },
  { id: "anode_wet_thickness", variableName: "anode_wet_thickness", displayName: "Anode Wet Thick", description: "Wet coating thickness (µm)", position: { x: 150, y: 650 } },
  { id: "anode_dry_temp", variableName: "anode_dry_temp", displayName: "Anode Dry Temp", description: "Drying temperature (°C)", position: { x: 300, y: 650 } },
  { id: "anode_calender_pressure", variableName: "anode_calender_pressure", displayName: "Anode Cal Press", description: "Calendering pressure (MPa)", position: { x: 450, y: 650 } },

  { id: "anode_loading", variableName: "anode_loading", displayName: "Anode Loading", description: "Areal capacity loading (mAh/cm²)", position: { x: 0, y: 700 } },
  { id: "anode_density", variableName: "anode_density", displayName: "Anode Density", description: "Electrode density (g/cm³)", position: { x: 150, y: 700 } },
  { id: "anode_porosity", variableName: "anode_porosity", displayName: "Anode Porosity", description: "Electrode void fraction (%)", position: { x: 300, y: 700 } },
  { id: "anode_thickness", variableName: "anode_thickness", displayName: "Anode Thickness", description: "Final coating thickness (µm)", position: { x: 450, y: 700 } },
  { id: "anode_conductivity", variableName: "anode_conductivity", displayName: "Anode σ", description: "Electronic conductivity (S/cm)", position: { x: 600, y: 700 } },
  { id: "anode_adhesion", variableName: "anode_adhesion", displayName: "Anode Adhesion", description: "Coating-foil adhesion (N/m)", position: { x: 750, y: 700 } },

  // ===== CELL ASSEMBLY (y: 750-800) =====
  { id: "np_ratio", variableName: "np_ratio", displayName: "N/P Ratio", description: "Anode to cathode capacity ratio", position: { x: 0, y: 750 } },
  { id: "electrode_alignment", variableName: "electrode_alignment", displayName: "Alignment", description: "Electrode stack alignment quality", position: { x: 150, y: 750 } },
  { id: "electrolyte_amount", variableName: "electrolyte_amount", displayName: "Elyte Amount", description: "Electrolyte volume (µL)", position: { x: 300, y: 750 } },
  { id: "electrolyte_filling", variableName: "electrolyte_filling", displayName: "Filling Method", description: "Electrolyte wetting/filling protocol", position: { x: 450, y: 750 } },
  { id: "stack_pressure", variableName: "stack_pressure", displayName: "Stack Pressure", description: "Cell compression pressure (psi)", position: { x: 600, y: 750 } },
  { id: "assembly_environment", variableName: "assembly_environment", displayName: "Assembly Env", description: "Glovebox atmosphere (H₂O, O₂ ppm)", position: { x: 750, y: 750 } },
  { id: "rest_time", variableName: "rest_time", displayName: "Rest Time", description: "Rest period before formation (hours)", position: { x: 900, y: 750 } },

  // ===== FORMATION (y: 850) =====
  { id: "formation_c_rate", variableName: "formation_c_rate", displayName: "Formation C-Rate", description: "Formation cycling rate (C)", position: { x: 0, y: 850 } },
  { id: "formation_cycles", variableName: "formation_cycles", displayName: "Formation Cycles", description: "Number of formation cycles", position: { x: 150, y: 850 } },
  { id: "formation_voltage_upper", variableName: "formation_voltage_upper", displayName: "Formation V Upper", description: "Formation upper voltage limit (V)", position: { x: 300, y: 850 } },
  { id: "formation_voltage_lower", variableName: "formation_voltage_lower", displayName: "Formation V Lower", description: "Formation lower voltage limit (V)", position: { x: 450, y: 850 } },
  { id: "formation_temperature", variableName: "formation_temperature", displayName: "Formation Temp", description: "Formation temperature (°C)", position: { x: 600, y: 850 } },
  { id: "formation_rest", variableName: "formation_rest", displayName: "Formation Rest", description: "Rest periods between cycles (min)", position: { x: 750, y: 850 } },

  // ===== INTERFACE LAYERS (y: 900) =====
  { id: "sei_thickness", variableName: "sei_thickness", displayName: "SEI Thickness", description: "Solid electrolyte interphase thickness (nm)", position: { x: 0, y: 900 } },
  { id: "sei_composition", variableName: "sei_composition", displayName: "SEI Composition", description: "SEI chemical makeup (LiF, Li₂CO₃, etc.)", position: { x: 150, y: 900 } },
  { id: "sei_stability", variableName: "sei_stability", displayName: "SEI Stability", description: "SEI mechanical and chemical stability", position: { x: 300, y: 900 } },
  { id: "cei_thickness", variableName: "cei_thickness", displayName: "CEI Thickness", description: "Cathode electrolyte interphase thickness", position: { x: 450, y: 900 } },
  { id: "cei_composition", variableName: "cei_composition", displayName: "CEI Composition", description: "CEI chemical makeup", position: { x: 600, y: 900 } },
  { id: "cei_stability", variableName: "cei_stability", displayName: "CEI Stability", description: "CEI stability during cycling", position: { x: 750, y: 900 } },

  // ===== CYCLING CONDITIONS (y: 950) =====
  { id: "cycling_c_rate_charge", variableName: "cycling_c_rate_charge", displayName: "Charge Rate", description: "Charging C-rate", position: { x: 0, y: 950 } },
  { id: "cycling_c_rate_discharge", variableName: "cycling_c_rate_discharge", displayName: "Discharge Rate", description: "Discharging C-rate", position: { x: 150, y: 950 } },
  { id: "cycling_voltage_upper", variableName: "cycling_voltage_upper", displayName: "Upper Cutoff", description: "Upper voltage limit (V)", position: { x: 300, y: 950 } },
  { id: "cycling_voltage_lower", variableName: "cycling_voltage_lower", displayName: "Lower Cutoff", description: "Lower voltage limit (V)", position: { x: 450, y: 950 } },
  { id: "cycling_temperature", variableName: "cycling_temperature", displayName: "Cycling Temp", description: "Cycling temperature (°C)", position: { x: 600, y: 950 } },
  { id: "cycling_rest_time", variableName: "cycling_rest_time", displayName: "Rest Time", description: "Rest between charge/discharge (min)", position: { x: 750, y: 950 } },

  // ===== DEGRADATION MECHANISMS (y: 1000) =====
  { id: "li_plating", variableName: "li_plating", displayName: "Li Plating", description: "Lithium metal plating on anode", position: { x: 0, y: 1000 } },
  { id: "particle_cracking", variableName: "particle_cracking", displayName: "Particle Cracking", description: "CAM particle mechanical failure", position: { x: 150, y: 1000 } },
  { id: "transition_metal_dissolution", variableName: "transition_metal_dissolution", displayName: "TM Dissolution", description: "Transition metal leaching from cathode", position: { x: 300, y: 1000 } },
  { id: "electrolyte_decomposition", variableName: "electrolyte_decomposition", displayName: "Elyte Decomp", description: "Electrolyte oxidation/reduction", position: { x: 450, y: 1000 } },
  { id: "gas_evolution", variableName: "gas_evolution", displayName: "Gas Evolution", description: "CO₂, CO, H₂ generation", position: { x: 600, y: 1000 } },
  { id: "contact_loss", variableName: "contact_loss", displayName: "Contact Loss", description: "Electronic isolation of particles", position: { x: 750, y: 1000 } },
  { id: "li_inventory_loss", variableName: "li_inventory_loss", displayName: "Li Inventory Loss", description: "Cyclable lithium consumption", position: { x: 900, y: 1000 } },

  // ===== PERFORMANCE OUTPUTS (y: 1100) =====
  { id: "initial_discharge_capacity", variableName: "initial_discharge_capacity", displayName: "Initial Capacity", description: "First cycle discharge capacity (mAh/g)", position: { x: 0, y: 1100 } },
  { id: "initial_charge_capacity", variableName: "initial_charge_capacity", displayName: "Initial Charge", description: "First cycle charge capacity (mAh/g)", position: { x: 150, y: 1100 } },
  { id: "first_cycle_efficiency", variableName: "first_cycle_efficiency", displayName: "1st Cycle Eff", description: "First cycle Coulombic efficiency (%)", position: { x: 300, y: 1100 } },
  { id: "rate_capability_2c", variableName: "rate_capability_2c", displayName: "2C Capability", description: "Capacity retention at 2C vs C/10 (%)", position: { x: 450, y: 1100 } },
  { id: "rate_capability_5c", variableName: "rate_capability_5c", displayName: "5C Capability", description: "Capacity retention at 5C vs C/10 (%)", position: { x: 600, y: 1100 } },
  { id: "capacity_retention_100", variableName: "capacity_retention_100", displayName: "Retention @100", description: "Capacity retention after 100 cycles (%)", position: { x: 750, y: 1100 } },
  { id: "capacity_retention_500", variableName: "capacity_retention_500", displayName: "Retention @500", description: "Capacity retention after 500 cycles (%)", position: { x: 900, y: 1100 } },
  { id: "average_coulombic_eff", variableName: "average_coulombic_eff", displayName: "Avg CE", description: "Average Coulombic efficiency (%)", position: { x: 1050, y: 1100 } },
  { id: "voltage_hysteresis", variableName: "voltage_hysteresis", displayName: "V Hysteresis", description: "Charge-discharge voltage gap (mV)", position: { x: 0, y: 1150 } },
  { id: "voltage_fade_rate", variableName: "voltage_fade_rate", displayName: "Voltage Fade", description: "Average voltage decrease (mV/cycle)", position: { x: 150, y: 1150 } },
  { id: "dcir_initial", variableName: "dcir_initial", displayName: "Initial DCIR", description: "Initial DC internal resistance (Ω)", position: { x: 300, y: 1150 } },
  { id: "dcir_growth", variableName: "dcir_growth", displayName: "DCIR Growth", description: "Resistance increase rate (%/cycle)", position: { x: 450, y: 1150 } },
  { id: "energy_density", variableName: "energy_density", displayName: "Energy Density", description: "Gravimetric energy density (Wh/kg)", position: { x: 600, y: 1150 } },
  { id: "power_density", variableName: "power_density", displayName: "Power Density", description: "Gravimetric power density (W/kg)", position: { x: 750, y: 1150 } }
];

const monsterBatteryEdges: CausalEdge[] = [
  // ===== CAM SYNTHESIS CHAIN =====
  // Composition → Coprecipitation targets
  { id: "mb1", source: "cam_ni_content", target: "cam_coprecip_ph" },
  { id: "mb2", source: "cam_ni_content", target: "cam_cation_mix" },
  { id: "mb3", source: "cam_mn_content", target: "cam_structure" },
  { id: "mb4", source: "cam_co_content", target: "cam_structure" },
  { id: "mb5", source: "cam_dopant", target: "cam_structure" },
  { id: "mb6", source: "cam_dopant_level", target: "cam_cation_mix" },

  // Coprecipitation → Precursor
  { id: "mb7", source: "cam_coprecip_ph", target: "cam_secondary_size" },
  { id: "mb8", source: "cam_coprecip_temp", target: "cam_secondary_size" },
  { id: "mb9", source: "cam_nh3_conc", target: "cam_secondary_size" },
  { id: "mb10", source: "cam_stirring", target: "cam_secondary_size" },
  { id: "mb11", source: "cam_residence", target: "cam_tap_density" },

  // Calcination → CAM structure
  { id: "mb12", source: "cam_li_ratio", target: "cam_residual_li" },
  { id: "mb13", source: "cam_li_ratio", target: "cam_cation_mix" },
  { id: "mb14", source: "cam_calc_temp", target: "cam_structure" },
  { id: "mb15", source: "cam_calc_temp", target: "cam_primary_size" },
  { id: "mb16", source: "cam_calc_temp", target: "cam_cation_mix" },
  { id: "mb17", source: "cam_calc_time", target: "cam_primary_size" },
  { id: "mb18", source: "cam_calc_atm", target: "cam_cation_mix" },
  { id: "mb19", source: "cam_cooling", target: "cam_structure" },

  // CAM properties cross-links
  { id: "mb20", source: "cam_primary_size", target: "cam_surface_area" },
  { id: "mb21", source: "cam_secondary_size", target: "cam_surface_area" },
  { id: "mb22", source: "cam_secondary_size", target: "cam_tap_density" },

  // Coating
  { id: "mb23", source: "cam_coating_type", target: "cam_coating_thickness" },
  { id: "mb24", source: "cam_coating_amount", target: "cam_coating_thickness" },

  // ===== ELECTROLYTE CHAIN =====
  { id: "mb25", source: "salt_type", target: "electrolyte_conductivity" },
  { id: "mb26", source: "salt_concentration", target: "electrolyte_conductivity" },
  { id: "mb27", source: "salt_concentration", target: "electrolyte_viscosity" },
  { id: "mb28", source: "solvent_ec_content", target: "electrolyte_conductivity" },
  { id: "mb29", source: "solvent_ec_content", target: "sei_composition" },
  { id: "mb30", source: "solvent_dmc_content", target: "electrolyte_viscosity" },
  { id: "mb31", source: "solvent_emc_content", target: "electrolyte_viscosity" },
  { id: "mb32", source: "additive_vc", target: "sei_composition" },
  { id: "mb33", source: "additive_vc", target: "sei_stability" },
  { id: "mb34", source: "additive_fec", target: "sei_composition" },
  { id: "mb35", source: "additive_fec", target: "sei_stability" },
  { id: "mb36", source: "additive_other", target: "cei_composition" },

  // ===== SEPARATOR CHAIN =====
  { id: "mb37", source: "separator_material", target: "separator_wettability" },
  { id: "mb38", source: "separator_thickness", target: "dcir_initial" },
  { id: "mb39", source: "separator_porosity", target: "electrolyte_conductivity" },
  { id: "mb40", source: "separator_coating", target: "separator_wettability" },

  // ===== CATHODE ELECTRODE CHAIN =====
  { id: "mb41", source: "cam_tap_density", target: "cathode_density" },
  { id: "mb42", source: "cam_surface_area", target: "cathode_porosity" },
  { id: "mb43", source: "cam_secondary_size", target: "cathode_loading" },
  { id: "mb44", source: "cathode_am_content", target: "cathode_density" },
  { id: "mb45", source: "cathode_carbon_type", target: "cathode_conductivity" },
  { id: "mb46", source: "cathode_carbon_content", target: "cathode_conductivity" },
  { id: "mb47", source: "cathode_binder_type", target: "cathode_adhesion" },
  { id: "mb48", source: "cathode_binder_content", target: "cathode_adhesion" },
  { id: "mb49", source: "cathode_nmp_content", target: "cathode_porosity" },
  { id: "mb50", source: "cathode_mixing_speed", target: "cathode_conductivity" },
  { id: "mb51", source: "cathode_wet_thickness", target: "cathode_thickness" },
  { id: "mb52", source: "cathode_dry_temp", target: "cathode_adhesion" },
  { id: "mb53", source: "cathode_calender_pressure", target: "cathode_density" },
  { id: "mb54", source: "cathode_calender_pressure", target: "cathode_porosity" },
  { id: "mb55", source: "cathode_density", target: "cathode_porosity" },
  { id: "mb56", source: "cathode_porosity", target: "cathode_tortuosity" },

  // ===== ANODE ELECTRODE CHAIN =====
  { id: "mb57", source: "graphite_type", target: "anode_density" },
  { id: "mb58", source: "graphite_particle_size", target: "anode_porosity" },
  { id: "mb59", source: "graphite_surface_area", target: "sei_thickness" },
  { id: "mb60", source: "silicon_content", target: "anode_density" },
  { id: "mb61", source: "silicon_content", target: "sei_stability" },
  { id: "mb62", source: "silicon_particle_size", target: "sei_thickness" },
  { id: "mb63", source: "anode_am_content", target: "anode_density" },
  { id: "mb64", source: "anode_carbon_content", target: "anode_conductivity" },
  { id: "mb65", source: "anode_binder_type", target: "anode_adhesion" },
  { id: "mb66", source: "anode_binder_content", target: "anode_adhesion" },
  { id: "mb67", source: "anode_calender_pressure", target: "anode_density" },
  { id: "mb68", source: "anode_calender_pressure", target: "anode_porosity" },

  // ===== CELL ASSEMBLY CHAIN =====
  { id: "mb69", source: "cathode_loading", target: "np_ratio" },
  { id: "mb70", source: "anode_loading", target: "np_ratio" },
  { id: "mb71", source: "np_ratio", target: "li_plating" },
  { id: "mb72", source: "electrolyte_amount", target: "dcir_initial" },
  { id: "mb73", source: "electrolyte_filling", target: "separator_wettability" },
  { id: "mb74", source: "stack_pressure", target: "contact_loss" },
  { id: "mb75", source: "assembly_environment", target: "sei_composition" },

  // ===== FORMATION CHAIN =====
  { id: "mb76", source: "formation_c_rate", target: "sei_thickness" },
  { id: "mb77", source: "formation_c_rate", target: "sei_composition" },
  { id: "mb78", source: "formation_cycles", target: "sei_stability" },
  { id: "mb79", source: "formation_voltage_upper", target: "cei_thickness" },
  { id: "mb80", source: "formation_temperature", target: "sei_composition" },
  { id: "mb81", source: "electrolyte_conductivity", target: "sei_thickness" },

  // ===== INTERFACE → DEGRADATION =====
  { id: "mb82", source: "sei_thickness", target: "first_cycle_efficiency" },
  { id: "mb83", source: "sei_stability", target: "li_inventory_loss" },
  { id: "mb84", source: "sei_stability", target: "average_coulombic_eff" },
  { id: "mb85", source: "cei_thickness", target: "first_cycle_efficiency" },
  { id: "mb86", source: "cei_stability", target: "transition_metal_dissolution" },
  { id: "mb87", source: "cei_stability", target: "electrolyte_decomposition" },

  // ===== CYCLING → DEGRADATION =====
  { id: "mb88", source: "cycling_c_rate_charge", target: "li_plating" },
  { id: "mb89", source: "cycling_c_rate_discharge", target: "particle_cracking" },
  { id: "mb90", source: "cycling_voltage_upper", target: "electrolyte_decomposition" },
  { id: "mb91", source: "cycling_voltage_upper", target: "transition_metal_dissolution" },
  { id: "mb92", source: "cycling_voltage_lower", target: "particle_cracking" },
  { id: "mb93", source: "cycling_temperature", target: "electrolyte_decomposition" },
  { id: "mb94", source: "cycling_temperature", target: "sei_stability" },

  // ===== DEGRADATION → PERFORMANCE =====
  { id: "mb95", source: "li_plating", target: "capacity_retention_100" },
  { id: "mb96", source: "li_plating", target: "average_coulombic_eff" },
  { id: "mb97", source: "particle_cracking", target: "contact_loss" },
  { id: "mb98", source: "particle_cracking", target: "dcir_growth" },
  { id: "mb99", source: "transition_metal_dissolution", target: "sei_stability" },
  { id: "mb100", source: "transition_metal_dissolution", target: "capacity_retention_500" },
  { id: "mb101", source: "electrolyte_decomposition", target: "gas_evolution" },
  { id: "mb102", source: "electrolyte_decomposition", target: "dcir_growth" },
  { id: "mb103", source: "contact_loss", target: "dcir_growth" },
  { id: "mb104", source: "contact_loss", target: "capacity_retention_100" },
  { id: "mb105", source: "li_inventory_loss", target: "capacity_retention_100" },
  { id: "mb106", source: "li_inventory_loss", target: "capacity_retention_500" },

  // ===== CAM → PERFORMANCE =====
  { id: "mb107", source: "cam_structure", target: "initial_discharge_capacity" },
  { id: "mb108", source: "cam_cation_mix", target: "initial_discharge_capacity" },
  { id: "mb109", source: "cam_cation_mix", target: "rate_capability_2c" },
  { id: "mb110", source: "cam_primary_size", target: "rate_capability_2c" },
  { id: "mb111", source: "cam_primary_size", target: "rate_capability_5c" },
  { id: "mb112", source: "cam_surface_area", target: "first_cycle_efficiency" },
  { id: "mb113", source: "cam_residual_li", target: "first_cycle_efficiency" },
  { id: "mb114", source: "cam_residual_li", target: "gas_evolution" },
  { id: "mb115", source: "cam_coating_thickness", target: "transition_metal_dissolution" },
  { id: "mb116", source: "cam_coating_thickness", target: "capacity_retention_500" },
  { id: "mb117", source: "cam_ni_content", target: "initial_discharge_capacity" },
  { id: "mb118", source: "cam_ni_content", target: "particle_cracking" },

  // ===== ELECTRODE → PERFORMANCE =====
  { id: "mb119", source: "cathode_density", target: "energy_density" },
  { id: "mb120", source: "cathode_porosity", target: "rate_capability_2c" },
  { id: "mb121", source: "cathode_tortuosity", target: "rate_capability_5c" },
  { id: "mb122", source: "cathode_conductivity", target: "rate_capability_2c" },
  { id: "mb123", source: "cathode_adhesion", target: "capacity_retention_100" },
  { id: "mb124", source: "anode_porosity", target: "rate_capability_2c" },
  { id: "mb125", source: "anode_conductivity", target: "rate_capability_2c" },

  // ===== ELECTROLYTE → PERFORMANCE =====
  { id: "mb126", source: "electrolyte_conductivity", target: "dcir_initial" },
  { id: "mb127", source: "electrolyte_conductivity", target: "rate_capability_2c" },
  { id: "mb128", source: "electrolyte_viscosity", target: "rate_capability_5c" },

  // ===== PERFORMANCE CROSS-LINKS =====
  { id: "mb129", source: "initial_discharge_capacity", target: "energy_density" },
  { id: "mb130", source: "initial_charge_capacity", target: "first_cycle_efficiency" },
  { id: "mb131", source: "dcir_initial", target: "voltage_hysteresis" },
  { id: "mb132", source: "dcir_initial", target: "power_density" },
  { id: "mb133", source: "dcir_growth", target: "voltage_fade_rate" },
  { id: "mb134", source: "dcir_growth", target: "capacity_retention_500" },
  { id: "mb135", source: "rate_capability_2c", target: "power_density" }
];

// ============ PRESET 7: Classical MD Electrolyte Conductivity ============
const mdElectrolyteContext = `This causal model represents classical molecular dynamics (MD) simulation of bulk electrolyte ionic conductivity. The simulation uses empirical force fields (e.g., OPLS-AA, GAFF, CL&P) to model Li-ion transport in liquid electrolyte. Key outputs include ionic conductivity, Li⁺ transference number, and diffusion coefficients. Results depend on force field parameters, system setup, simulation protocol, and analysis methods. This is relevant for screening electrolyte formulations before experimental synthesis.`;

const mdElectrolyteNodes: CausalNode[] = [
  // ===== SYSTEM SETUP (y: 0) =====
  { id: "md_salt_type", variableName: "md_salt_type", displayName: "Salt Type", description: "Lithium salt identity (LiPF₆, LiFSI, LiTFSI, etc.)", position: { x: 0, y: 0 } },
  { id: "md_salt_conc", variableName: "md_salt_conc", displayName: "Salt Concentration", description: "Lithium salt molarity (M)", position: { x: 150, y: 0 } },
  { id: "md_solvent_1", variableName: "md_solvent_1", displayName: "Solvent 1", description: "Primary solvent molecule (EC, PC, etc.)", position: { x: 300, y: 0 } },
  { id: "md_solvent_2", variableName: "md_solvent_2", displayName: "Solvent 2", description: "Co-solvent molecule (DMC, EMC, DEC, etc.)", position: { x: 450, y: 0 } },
  { id: "md_solvent_ratio", variableName: "md_solvent_ratio", displayName: "Solvent Ratio", description: "Volume ratio of solvents", position: { x: 600, y: 0 } },
  { id: "md_num_lipf6", variableName: "md_num_lipf6", displayName: "# Salt Pairs", description: "Number of Li-anion pairs in simulation box", position: { x: 750, y: 0 } },
  { id: "md_num_solvent", variableName: "md_num_solvent", displayName: "# Solvent Molecules", description: "Total solvent molecules in box", position: { x: 900, y: 0 } },
  { id: "md_box_size", variableName: "md_box_size", displayName: "Box Size", description: "Simulation box edge length (nm)", position: { x: 1050, y: 0 } },

  // ===== FORCE FIELD (y: 100) =====
  { id: "md_ff_type", variableName: "md_ff_type", displayName: "Force Field", description: "Force field family (OPLS-AA, GAFF, CL&P, APPLE&P)", position: { x: 0, y: 100 } },
  { id: "md_charge_scaling", variableName: "md_charge_scaling", displayName: "Charge Scaling", description: "Ionic charge scaling factor (0.7-1.0)", position: { x: 150, y: 100 } },
  { id: "md_lj_params", variableName: "md_lj_params", displayName: "LJ Parameters", description: "Lennard-Jones σ and ε parameters", position: { x: 300, y: 100 } },
  { id: "md_polarizable", variableName: "md_polarizable", displayName: "Polarizability", description: "Whether polarizable FF is used", position: { x: 450, y: 100 } },
  { id: "md_combining_rule", variableName: "md_combining_rule", displayName: "Combining Rules", description: "LJ combining rules (geometric, arithmetic)", position: { x: 600, y: 100 } },

  // ===== SIMULATION PARAMETERS (y: 200) =====
  { id: "md_temperature", variableName: "md_temperature", displayName: "Temperature", description: "Simulation temperature (K)", position: { x: 0, y: 200 } },
  { id: "md_pressure", variableName: "md_pressure", displayName: "Pressure", description: "System pressure (bar)", position: { x: 150, y: 200 } },
  { id: "md_timestep", variableName: "md_timestep", displayName: "Timestep", description: "Integration timestep (fs)", position: { x: 300, y: 200 } },
  { id: "md_thermostat", variableName: "md_thermostat", displayName: "Thermostat", description: "Temperature coupling method (Nosé-Hoover, V-rescale)", position: { x: 450, y: 200 } },
  { id: "md_barostat", variableName: "md_barostat", displayName: "Barostat", description: "Pressure coupling method (Parrinello-Rahman, Berendsen)", position: { x: 600, y: 200 } },
  { id: "md_cutoff", variableName: "md_cutoff", displayName: "Cutoff Distance", description: "Non-bonded interaction cutoff (nm)", position: { x: 750, y: 200 } },
  { id: "md_ewald", variableName: "md_ewald", displayName: "Electrostatics", description: "Long-range electrostatics (PME, reaction field)", position: { x: 900, y: 200 } },

  // ===== SIMULATION PROTOCOL (y: 300) =====
  { id: "md_equilibration_time", variableName: "md_equilibration_time", displayName: "Equilibration", description: "Equilibration run time (ns)", position: { x: 0, y: 300 } },
  { id: "md_production_time", variableName: "md_production_time", displayName: "Production Time", description: "Production run time (ns)", position: { x: 150, y: 300 } },
  { id: "md_trajectory_freq", variableName: "md_trajectory_freq", displayName: "Save Frequency", description: "Trajectory save interval (ps)", position: { x: 300, y: 300 } },
  { id: "md_num_replicas", variableName: "md_num_replicas", displayName: "# Replicas", description: "Number of independent simulations", position: { x: 450, y: 300 } },

  // ===== STRUCTURAL PROPERTIES (y: 400) =====
  { id: "md_density", variableName: "md_density", displayName: "Density", description: "Equilibrium liquid density (g/cm³)", position: { x: 0, y: 400 } },
  { id: "md_rdf_li_o", variableName: "md_rdf_li_o", displayName: "g(r) Li-O", description: "Li-solvent oxygen radial distribution", position: { x: 150, y: 400 } },
  { id: "md_coordination_number", variableName: "md_coordination_number", displayName: "Li Coordination", description: "Average Li⁺ solvation number", position: { x: 300, y: 400 } },
  { id: "md_ion_pairing", variableName: "md_ion_pairing", displayName: "Ion Pairing", description: "Contact ion pair fraction", position: { x: 450, y: 400 } },
  { id: "md_cluster_size", variableName: "md_cluster_size", displayName: "Cluster Size", description: "Average ionic cluster size", position: { x: 600, y: 400 } },

  // ===== DYNAMIC PROPERTIES (y: 500) =====
  { id: "md_li_msd", variableName: "md_li_msd", displayName: "Li⁺ MSD", description: "Li⁺ mean squared displacement", position: { x: 0, y: 500 } },
  { id: "md_anion_msd", variableName: "md_anion_msd", displayName: "Anion MSD", description: "Anion mean squared displacement", position: { x: 150, y: 500 } },
  { id: "md_solvent_msd", variableName: "md_solvent_msd", displayName: "Solvent MSD", description: "Solvent mean squared displacement", position: { x: 300, y: 500 } },
  { id: "md_li_diffusivity", variableName: "md_li_diffusivity", displayName: "D_Li", description: "Li⁺ self-diffusion coefficient (m²/s)", position: { x: 450, y: 500 } },
  { id: "md_anion_diffusivity", variableName: "md_anion_diffusivity", displayName: "D_anion", description: "Anion self-diffusion coefficient (m²/s)", position: { x: 600, y: 500 } },
  { id: "md_viscosity", variableName: "md_viscosity", displayName: "Viscosity", description: "Bulk viscosity from Green-Kubo (cP)", position: { x: 750, y: 500 } },
  { id: "md_residence_time", variableName: "md_residence_time", displayName: "Residence Time", description: "Li⁺ solvation shell residence time (ps)", position: { x: 900, y: 500 } },

  // ===== TRANSPORT OUTPUTS (y: 600) =====
  { id: "md_conductivity_ne", variableName: "md_conductivity_ne", displayName: "σ (Nernst-Einstein)", description: "Conductivity from NE equation (mS/cm)", position: { x: 0, y: 600 } },
  { id: "md_conductivity_gk", variableName: "md_conductivity_gk", displayName: "σ (Green-Kubo)", description: "Conductivity from current autocorrelation (mS/cm)", position: { x: 200, y: 600 } },
  { id: "md_haven_ratio", variableName: "md_haven_ratio", displayName: "Haven Ratio", description: "σ_GK / σ_NE (correlation effects)", position: { x: 400, y: 600 } },
  { id: "md_transference", variableName: "md_transference", displayName: "t_Li⁺", description: "Li⁺ transference number", position: { x: 600, y: 600 } },
  { id: "md_molar_conductivity", variableName: "md_molar_conductivity", displayName: "Λ", description: "Molar conductivity (S·cm²/mol)", position: { x: 800, y: 600 } }
];

const mdElectrolyteEdges: CausalEdge[] = [
  // System setup → Structure
  { id: "mde1", source: "md_salt_type", target: "md_ion_pairing" },
  { id: "mde2", source: "md_salt_type", target: "md_coordination_number" },
  { id: "mde3", source: "md_salt_conc", target: "md_density" },
  { id: "mde4", source: "md_salt_conc", target: "md_ion_pairing" },
  { id: "mde5", source: "md_salt_conc", target: "md_cluster_size" },
  { id: "mde6", source: "md_solvent_1", target: "md_rdf_li_o" },
  { id: "mde7", source: "md_solvent_1", target: "md_coordination_number" },
  { id: "mde8", source: "md_solvent_2", target: "md_viscosity" },
  { id: "mde9", source: "md_solvent_ratio", target: "md_density" },
  { id: "mde10", source: "md_num_lipf6", target: "md_box_size" },
  { id: "mde11", source: "md_box_size", target: "md_li_msd" },

  // Force field → Structure & Dynamics
  { id: "mde12", source: "md_ff_type", target: "md_density" },
  { id: "mde13", source: "md_ff_type", target: "md_rdf_li_o" },
  { id: "mde14", source: "md_charge_scaling", target: "md_ion_pairing" },
  { id: "mde15", source: "md_charge_scaling", target: "md_li_diffusivity" },
  { id: "mde16", source: "md_charge_scaling", target: "md_conductivity_ne" },
  { id: "mde17", source: "md_lj_params", target: "md_density" },
  { id: "mde18", source: "md_polarizable", target: "md_coordination_number" },
  { id: "mde19", source: "md_polarizable", target: "md_haven_ratio" },

  // Simulation params → Dynamics
  { id: "mde20", source: "md_temperature", target: "md_density" },
  { id: "mde21", source: "md_temperature", target: "md_li_diffusivity" },
  { id: "mde22", source: "md_temperature", target: "md_viscosity" },
  { id: "mde23", source: "md_timestep", target: "md_li_msd" },
  { id: "mde24", source: "md_thermostat", target: "md_li_diffusivity" },
  { id: "mde25", source: "md_cutoff", target: "md_density" },
  { id: "mde26", source: "md_ewald", target: "md_conductivity_gk" },

  // Protocol → Statistics
  { id: "mde27", source: "md_equilibration_time", target: "md_density" },
  { id: "mde28", source: "md_production_time", target: "md_li_msd" },
  { id: "mde29", source: "md_production_time", target: "md_conductivity_gk" },
  { id: "mde30", source: "md_trajectory_freq", target: "md_viscosity" },
  { id: "mde31", source: "md_num_replicas", target: "md_conductivity_ne" },

  // Structure → Dynamics
  { id: "mde32", source: "md_density", target: "md_viscosity" },
  { id: "mde33", source: "md_coordination_number", target: "md_residence_time" },
  { id: "mde34", source: "md_ion_pairing", target: "md_haven_ratio" },
  { id: "mde35", source: "md_ion_pairing", target: "md_transference" },
  { id: "mde36", source: "md_cluster_size", target: "md_li_diffusivity" },

  // MSD → Diffusivity
  { id: "mde37", source: "md_li_msd", target: "md_li_diffusivity" },
  { id: "mde38", source: "md_anion_msd", target: "md_anion_diffusivity" },
  { id: "mde39", source: "md_solvent_msd", target: "md_viscosity" },

  // Dynamics → Transport
  { id: "mde40", source: "md_li_diffusivity", target: "md_conductivity_ne" },
  { id: "mde41", source: "md_anion_diffusivity", target: "md_conductivity_ne" },
  { id: "mde42", source: "md_li_diffusivity", target: "md_transference" },
  { id: "mde43", source: "md_anion_diffusivity", target: "md_transference" },
  { id: "mde44", source: "md_viscosity", target: "md_conductivity_ne" },
  { id: "mde45", source: "md_residence_time", target: "md_li_diffusivity" },

  // Transport cross-links
  { id: "mde46", source: "md_conductivity_ne", target: "md_haven_ratio" },
  { id: "mde47", source: "md_conductivity_gk", target: "md_haven_ratio" },
  { id: "mde48", source: "md_conductivity_gk", target: "md_molar_conductivity" },
  { id: "mde49", source: "md_salt_conc", target: "md_molar_conductivity" }
];

// ============ PRESET 8: AIMD Electrolyte Conductivity ============
const aimdElectrolyteContext = `This causal model represents ab initio molecular dynamics (AIMD) simulation of bulk electrolyte ionic conductivity. Unlike classical MD, AIMD computes forces directly from DFT electronic structure at each timestep. This captures polarization, charge transfer, and chemical reactions but is computationally expensive, limiting system sizes (~100-200 atoms) and timescales (~10-100 ps). Key outputs include Li⁺ diffusivity and conductivity. AIMD is essential for validating/parameterizing classical force fields and studying reactive interfaces.`;

const aimdElectrolyteNodes: CausalNode[] = [
  // ===== SYSTEM SETUP (y: 0) =====
  { id: "aimd_salt_type", variableName: "aimd_salt_type", displayName: "Salt Type", description: "Lithium salt (LiPF₆, LiFSI, LiTFSI)", position: { x: 0, y: 0 } },
  { id: "aimd_salt_conc", variableName: "aimd_salt_conc", displayName: "Salt Concentration", description: "Approximate molarity (M)", position: { x: 150, y: 0 } },
  { id: "aimd_solvent", variableName: "aimd_solvent", displayName: "Solvent System", description: "Solvent composition (EC, DMC, etc.)", position: { x: 300, y: 0 } },
  { id: "aimd_num_atoms", variableName: "aimd_num_atoms", displayName: "# Atoms", description: "Total atoms in simulation cell", position: { x: 450, y: 0 } },
  { id: "aimd_num_li", variableName: "aimd_num_li", displayName: "# Li Ions", description: "Number of Li⁺ ions", position: { x: 600, y: 0 } },
  { id: "aimd_cell_size", variableName: "aimd_cell_size", displayName: "Cell Size", description: "Cubic cell edge length (Å)", position: { x: 750, y: 0 } },

  // ===== DFT PARAMETERS (y: 100) =====
  { id: "aimd_xc_functional", variableName: "aimd_xc_functional", displayName: "XC Functional", description: "Exchange-correlation (PBE, BLYP, revPBE, SCAN)", position: { x: 0, y: 100 } },
  { id: "aimd_dispersion", variableName: "aimd_dispersion", displayName: "Dispersion", description: "Van der Waals correction (D3, D4, TS)", position: { x: 150, y: 100 } },
  { id: "aimd_basis_type", variableName: "aimd_basis_type", displayName: "Basis Type", description: "Basis set type (PW, GPW, GAPW)", position: { x: 300, y: 100 } },
  { id: "aimd_cutoff", variableName: "aimd_cutoff", displayName: "PW Cutoff", description: "Plane-wave energy cutoff (Ry)", position: { x: 450, y: 100 } },
  { id: "aimd_pseudopotential", variableName: "aimd_pseudopotential", displayName: "Pseudopotential", description: "PP type (GTH, PAW, USPP)", position: { x: 600, y: 100 } },
  { id: "aimd_scf_convergence", variableName: "aimd_scf_convergence", displayName: "SCF Convergence", description: "Electronic convergence threshold", position: { x: 750, y: 100 } },

  // ===== MD PARAMETERS (y: 200) =====
  { id: "aimd_temperature", variableName: "aimd_temperature", displayName: "Temperature", description: "Target temperature (K)", position: { x: 0, y: 200 } },
  { id: "aimd_timestep", variableName: "aimd_timestep", displayName: "Timestep", description: "Integration timestep (fs)", position: { x: 150, y: 200 } },
  { id: "aimd_thermostat", variableName: "aimd_thermostat", displayName: "Thermostat", description: "Temperature control (Nosé-Hoover, CSVR)", position: { x: 300, y: 200 } },
  { id: "aimd_ensemble", variableName: "aimd_ensemble", displayName: "Ensemble", description: "Statistical ensemble (NVT, NPT)", position: { x: 450, y: 200 } },
  { id: "aimd_equilibration", variableName: "aimd_equilibration", displayName: "Equilibration", description: "Equilibration time (ps)", position: { x: 600, y: 200 } },
  { id: "aimd_production", variableName: "aimd_production", displayName: "Production Time", description: "Production trajectory length (ps)", position: { x: 750, y: 200 } },

  // ===== CONVERGENCE & SAMPLING (y: 300) =====
  { id: "aimd_energy_drift", variableName: "aimd_energy_drift", displayName: "Energy Drift", description: "Total energy conservation (Ha/ps)", position: { x: 0, y: 300 } },
  { id: "aimd_temp_fluctuation", variableName: "aimd_temp_fluctuation", displayName: "Temp Fluctuation", description: "Temperature standard deviation (K)", position: { x: 150, y: 300 } },
  { id: "aimd_sampling_efficiency", variableName: "aimd_sampling_efficiency", displayName: "Sampling", description: "Li⁺ diffusive events sampled", position: { x: 300, y: 300 } },
  { id: "aimd_finite_size_error", variableName: "aimd_finite_size_error", displayName: "Finite Size Error", description: "System size effects on diffusivity", position: { x: 450, y: 300 } },

  // ===== STRUCTURAL PROPERTIES (y: 400) =====
  { id: "aimd_density", variableName: "aimd_density", displayName: "Density", description: "Equilibrium density (g/cm³)", position: { x: 0, y: 400 } },
  { id: "aimd_li_coordination", variableName: "aimd_li_coordination", displayName: "Li Coordination", description: "Li⁺ solvation shell structure", position: { x: 150, y: 400 } },
  { id: "aimd_ion_pairing", variableName: "aimd_ion_pairing", displayName: "Ion Pairing", description: "Contact/solvent-separated ion pairs", position: { x: 300, y: 400 } },
  { id: "aimd_h_bonding", variableName: "aimd_h_bonding", displayName: "H-Bonding", description: "Hydrogen bond network structure", position: { x: 450, y: 400 } },
  { id: "aimd_charge_transfer", variableName: "aimd_charge_transfer", displayName: "Charge Transfer", description: "Partial charges from electronic structure", position: { x: 600, y: 400 } },

  // ===== DYNAMIC PROPERTIES (y: 500) =====
  { id: "aimd_li_msd", variableName: "aimd_li_msd", displayName: "Li⁺ MSD", description: "Li⁺ mean squared displacement (Å²)", position: { x: 0, y: 500 } },
  { id: "aimd_anion_msd", variableName: "aimd_anion_msd", displayName: "Anion MSD", description: "Anion mean squared displacement", position: { x: 150, y: 500 } },
  { id: "aimd_li_diffusivity", variableName: "aimd_li_diffusivity", displayName: "D_Li (AIMD)", description: "Li⁺ diffusion coefficient (cm²/s)", position: { x: 300, y: 500 } },
  { id: "aimd_anion_diffusivity", variableName: "aimd_anion_diffusivity", displayName: "D_anion (AIMD)", description: "Anion diffusion coefficient (cm²/s)", position: { x: 450, y: 500 } },
  { id: "aimd_residence_time", variableName: "aimd_residence_time", displayName: "Residence Time", description: "Li⁺ solvation shell lifetime (ps)", position: { x: 600, y: 500 } },
  { id: "aimd_exchange_events", variableName: "aimd_exchange_events", displayName: "Exchange Events", description: "Solvent exchange events observed", position: { x: 750, y: 500 } },

  // ===== TRANSPORT OUTPUTS (y: 600) =====
  { id: "aimd_conductivity", variableName: "aimd_conductivity", displayName: "σ (AIMD)", description: "Ionic conductivity from AIMD (mS/cm)", position: { x: 0, y: 600 } },
  { id: "aimd_transference", variableName: "aimd_transference", displayName: "t_Li⁺ (AIMD)", description: "Li⁺ transference number", position: { x: 200, y: 600 } },
  { id: "aimd_activation_energy", variableName: "aimd_activation_energy", displayName: "E_a", description: "Arrhenius activation energy (eV)", position: { x: 400, y: 600 } },
  { id: "aimd_extrapolated_300k", variableName: "aimd_extrapolated_300k", displayName: "σ @300K", description: "Conductivity extrapolated to 300K (mS/cm)", position: { x: 600, y: 600 } }
];

const aimdElectrolyteEdges: CausalEdge[] = [
  // System setup → Structure
  { id: "aimd1", source: "aimd_salt_type", target: "aimd_li_coordination" },
  { id: "aimd2", source: "aimd_salt_type", target: "aimd_ion_pairing" },
  { id: "aimd3", source: "aimd_salt_conc", target: "aimd_density" },
  { id: "aimd4", source: "aimd_salt_conc", target: "aimd_ion_pairing" },
  { id: "aimd5", source: "aimd_solvent", target: "aimd_li_coordination" },
  { id: "aimd6", source: "aimd_solvent", target: "aimd_h_bonding" },
  { id: "aimd7", source: "aimd_num_atoms", target: "aimd_finite_size_error" },
  { id: "aimd8", source: "aimd_num_li", target: "aimd_sampling_efficiency" },
  { id: "aimd9", source: "aimd_cell_size", target: "aimd_density" },

  // DFT params → Structure & Energy
  { id: "aimd10", source: "aimd_xc_functional", target: "aimd_density" },
  { id: "aimd11", source: "aimd_xc_functional", target: "aimd_li_coordination" },
  { id: "aimd12", source: "aimd_xc_functional", target: "aimd_charge_transfer" },
  { id: "aimd13", source: "aimd_dispersion", target: "aimd_density" },
  { id: "aimd14", source: "aimd_dispersion", target: "aimd_h_bonding" },
  { id: "aimd15", source: "aimd_cutoff", target: "aimd_energy_drift" },
  { id: "aimd16", source: "aimd_pseudopotential", target: "aimd_charge_transfer" },
  { id: "aimd17", source: "aimd_scf_convergence", target: "aimd_energy_drift" },

  // MD params → Sampling
  { id: "aimd18", source: "aimd_temperature", target: "aimd_li_diffusivity" },
  { id: "aimd19", source: "aimd_temperature", target: "aimd_temp_fluctuation" },
  { id: "aimd20", source: "aimd_timestep", target: "aimd_energy_drift" },
  { id: "aimd21", source: "aimd_thermostat", target: "aimd_temp_fluctuation" },
  { id: "aimd22", source: "aimd_ensemble", target: "aimd_density" },
  { id: "aimd23", source: "aimd_equilibration", target: "aimd_density" },
  { id: "aimd24", source: "aimd_production", target: "aimd_li_msd" },
  { id: "aimd25", source: "aimd_production", target: "aimd_sampling_efficiency" },

  // Convergence → Dynamics
  { id: "aimd26", source: "aimd_energy_drift", target: "aimd_li_msd" },
  { id: "aimd27", source: "aimd_sampling_efficiency", target: "aimd_li_diffusivity" },
  { id: "aimd28", source: "aimd_finite_size_error", target: "aimd_li_diffusivity" },

  // Structure → Dynamics
  { id: "aimd29", source: "aimd_density", target: "aimd_li_diffusivity" },
  { id: "aimd30", source: "aimd_li_coordination", target: "aimd_residence_time" },
  { id: "aimd31", source: "aimd_li_coordination", target: "aimd_exchange_events" },
  { id: "aimd32", source: "aimd_ion_pairing", target: "aimd_transference" },
  { id: "aimd33", source: "aimd_h_bonding", target: "aimd_li_diffusivity" },
  { id: "aimd34", source: "aimd_charge_transfer", target: "aimd_ion_pairing" },

  // MSD → Diffusivity
  { id: "aimd35", source: "aimd_li_msd", target: "aimd_li_diffusivity" },
  { id: "aimd36", source: "aimd_anion_msd", target: "aimd_anion_diffusivity" },
  { id: "aimd37", source: "aimd_residence_time", target: "aimd_li_diffusivity" },
  { id: "aimd38", source: "aimd_exchange_events", target: "aimd_li_diffusivity" },

  // Diffusivity → Transport
  { id: "aimd39", source: "aimd_li_diffusivity", target: "aimd_conductivity" },
  { id: "aimd40", source: "aimd_anion_diffusivity", target: "aimd_conductivity" },
  { id: "aimd41", source: "aimd_li_diffusivity", target: "aimd_transference" },
  { id: "aimd42", source: "aimd_anion_diffusivity", target: "aimd_transference" },

  // Temperature dependence
  { id: "aimd43", source: "aimd_temperature", target: "aimd_activation_energy" },
  { id: "aimd44", source: "aimd_li_diffusivity", target: "aimd_activation_energy" },
  { id: "aimd45", source: "aimd_activation_energy", target: "aimd_extrapolated_300k" },
  { id: "aimd46", source: "aimd_conductivity", target: "aimd_extrapolated_300k" }
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
    id: 'whyzen-rde',
    name: 'Whyzen RDE (Full)',
    description: `Whyzen ORR model (${whyzenRdeNodes.length} nodes, ${whyzenRdeEdges.length} edges)`,
    graph: {
      nodes: whyzenRdeNodes,
      edges: whyzenRdeEdges,
      experimentalContext: whyzenRdeContext
    }
  },
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
    name: 'RDE Catalysis (Simple)',
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
  },
  {
    id: 'cathode-synthesis',
    name: 'Cathode Synthesis → Coin Cell',
    description: `NMC cathode from coprecipitation to cycling (${cathodeSynthNodes.length} nodes)`,
    graph: {
      nodes: cathodeSynthNodes,
      edges: cathodeSynthEdges,
      experimentalContext: cathodeSynthContext
    }
  },
  {
    id: 'monster-battery',
    name: 'MONSTER Battery',
    description: `Complete battery workflow: synthesis → cycling (${monsterBatteryNodes.length} nodes, ${monsterBatteryEdges.length} edges)`,
    graph: {
      nodes: monsterBatteryNodes,
      edges: monsterBatteryEdges,
      experimentalContext: monsterBatteryContext
    }
  },
  {
    id: 'md-electrolyte',
    name: 'MD Electrolyte Conductivity',
    description: `Classical MD simulation of Li⁺ transport (${mdElectrolyteNodes.length} nodes)`,
    graph: {
      nodes: mdElectrolyteNodes,
      edges: mdElectrolyteEdges,
      experimentalContext: mdElectrolyteContext
    }
  },
  {
    id: 'aimd-electrolyte',
    name: 'AIMD Electrolyte Conductivity',
    description: `Ab initio MD simulation of Li⁺ transport (${aimdElectrolyteNodes.length} nodes)`,
    graph: {
      nodes: aimdElectrolyteNodes,
      edges: aimdElectrolyteEdges,
      experimentalContext: aimdElectrolyteContext
    }
  },
  {
    id: 'drx-cathode',
    name: 'DRX Cathode Experiments',
    description: `Disordered rocksalt cathode composition and testing (${drxGraphRaw.nodes.length} nodes, ${drxGraphRaw.edges.length} edges)`,
    graph: {
      nodes: drxGraphRaw.nodes as CausalNode[],
      edges: drxGraphRaw.edges as CausalEdge[],
      experimentalContext: drxGraphRaw.experimentalContext
    }
  }
];

// Default export - Whyzen RDE is now the default
export const initialGraph: CausalGraph = experimentPresets[0].graph;
export const experimentalContext = whyzenRdeContext;
export const initialNodes = whyzenRdeNodes;
export const initialEdges = whyzenRdeEdges;
