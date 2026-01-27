// Whyzen-specific metadata (preserved during import/export)
export interface WhyzenMetadata {
  node_type: 'RootNode' | 'DeterministicRootNode' | 'Node' | 'DeterministicNode' | string;
  mechanism_type: string | null;
  kernel_type: string | null;
  kernel_params: Record<string, string>;
  level: 'global' | 'experiment' | 'timepoint' | string;
}

// Node classification for hypothesis generation
export type NodeClassification = 'intervenable' | 'observable' | 'desirable' | null;

// Causal node representing a factor in the experiment
export interface CausalNode {
  id: string;
  variableName: string;      // computer-readable, e.g., "rotation_rate"
  displayName: string;       // human-readable, e.g., "Rotation Rate"
  description: string;       // what this variable represents
  classification?: NodeClassification;
  isDesirable?: boolean;
  // Position for react-flow
  position?: { x: number; y: number };
  // Whyzen metadata (optional - present when imported from Whyzen)
  _whyzen?: WhyzenMetadata;
}

// Directed edge from source (cause) to target (effect)
export interface CausalEdge {
  id: string;
  source: string; // upstream node id (the cause)
  target: string; // downstream node id (the effect)
}

// The complete causal graph
export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  experimentalContext: string; // paragraph describing the domain
}

// A proposal for a new node (cause or effect)
// Uses Pearl's causal terminology: parent/ancestor for causes, child/descendant for effects
export interface Proposal {
  id: string;
  variableName: string;
  displayName: string;
  rationale: string;         // 2-3 sentences
  relation: "parent" | "ancestor" | "child" | "descendant";  // Pearl terminology
  status: "pending" | "complete" | "assessing";
  targetNodeId: string;      // The node this relates to
  direction: "upstream" | "downstream";  // Whether this is a cause or effect
  likelihood?: "high" | "medium" | "low";  // Critic assessment
  criticReason?: string;     // Why the critic rated it this way
  count?: number;            // How many times this was proposed (for consolidation confidence)
}

// A proposal to connect an existing node
export interface ExistingNodeProposal {
  id: string;
  nodeId: string;            // The existing node to connect
  displayName: string;       // For display purposes
  rationale: string;         // Why this connection makes sense
  targetNodeId: string;      // The node this relates to
  direction: "upstream" | "downstream";
  likelihood: "high" | "medium" | "low";
  criticReason?: string;
}

// Configuration for proposal generation
export interface ProposalConfig {
  numCycles: number;         // Number of generation rounds
  numProposalsPerCycle: number;  // Proposals per round
}

// ============================================
// Build from Data Types
// ============================================

// A data column for graph building
export interface DataColumn {
  name: string;
  description?: string;
}

// Configuration for the graph builder
export interface GraphBuilderConfig {
  preset: 'fast' | 'balanced' | 'heavy' | 'custom';
  iterations: number;  // 1 for fast, 2-3 for balanced, 4+ for heavy
}

// Result from the graph builder
export interface GraphBuildResult {
  graph: CausalGraph;
  iterations: number;
  critiqueSummary: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Action Space Types
// ============================================

export interface ActionDefinition {
  id: string;
  name: string;
  type: 'md_simulation' | 'experiment' | 'literature' | 'dataset' | 'custom';
  description: string;
  parameterHints?: string[];
}

export interface ActionSpace {
  actions: ActionDefinition[];
}

// ============================================
// Hypothesis Types
// ============================================

export interface HypothesisActionHook {
  actionId: string;
  actionName: string;
  parameters: Record<string, string>;
  instructions: string;
}

export interface Hypothesis {
  id: string;
  createdAt: string;
  intervenables: string[];
  observables: string[];
  desirables: string[];
  prescription: string;
  predictions: {
    observables: string;
    desirables: string;
  };
  story: string;
  actionHooks: HypothesisActionHook[];
  critique: string;
  status: 'active' | 'outdated';
  outdatedReason?: string;
}

// Configuration for batch hypothesis generation
export interface HypothesisGenerationConfig {
  count: number;          // Number of hypotheses to generate (1-10)
  diversityHint?: string; // Optional hint to encourage diverse hypotheses
}

// Result of batch hypothesis generation
export interface HypothesisBatch {
  id: string;
  createdAt: string;
  hypotheses: Hypothesis[];
  config: HypothesisGenerationConfig;
}

// ============================================
// Consolidated Action Types
// ============================================

// An action linked to multiple hypotheses
export interface ConsolidatedAction {
  id: string;
  actionId: string;                    // Original action definition ID
  actionName: string;
  actionType: ActionDefinition['type'];
  description: string;

  // Aggregated from hypothesis action hooks
  hypothesisLinks: {
    hypothesisId: string;
    parameters: Record<string, string>;
    instructions: string;
  }[];

  // Utility score (higher = serves more hypotheses)
  utilityScore: number;

  // Merged parameters (common across hypotheses)
  commonParameters: Record<string, string>;

  // LLM-generated consolidated instructions
  consolidatedInstructions: string;
}

export interface ConsolidatedActionSet {
  id: string;
  createdAt: string;
  actions: ConsolidatedAction[];
  sourceHypothesisIds: string[];
  conditioningText?: string;
}

// ============================================
// Action Space Visualization Types
// ============================================

// Visualization modes
export type VisualizationMode = 'causal' | 'action-space';

// Node types for action space graph
export interface ActionSpaceNode {
  id: string;
  type: 'hypothesis' | 'action';
  data: {
    // For hypothesis nodes
    hypothesis?: Hypothesis;
    // For action nodes
    action?: ConsolidatedAction;
    // Common
    label: string;
    isHighlighted?: boolean;
  };
  position: { x: number; y: number };
}

export interface ActionSpaceEdge {
  id: string;
  source: string;  // hypothesis node ID
  target: string;  // action node ID
  animated?: boolean;
}

export interface ActionSpaceGraph {
  nodes: ActionSpaceNode[];
  edges: ActionSpaceEdge[];
}

// ============================================
// Action Modification Types
// ============================================

// Proposed modification to an action's parameters or instructions
export interface ActionModification {
  id: string;
  actionId: string;
  originalParameters: Record<string, string>;
  proposedParameters: Record<string, string>;
  originalInstructions: string;
  proposedInstructions: string;
  rationale: string;
  affectedHypothesisIds: string[];
  status: 'pending' | 'applied' | 'rejected';
}

// Exported action for external use
export interface ExportedAction {
  name: string;
  type: ActionDefinition['type'];
  description: string;
  parameters: Record<string, string>;
  instructions: string;
  sourceHypotheses: string[];  // Human-readable hypothesis summaries
}
