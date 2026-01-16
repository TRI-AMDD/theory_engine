// Whyzen-specific metadata (preserved during import/export)
export interface WhyzenMetadata {
  node_type: 'RootNode' | 'DeterministicRootNode' | 'Node' | 'DeterministicNode' | string;
  mechanism_type: string | null;
  kernel_type: string | null;
  kernel_params: Record<string, string>;
  level: 'global' | 'experiment' | 'timepoint' | string;
}

// Causal node representing a factor in the experiment
export interface CausalNode {
  id: string;
  variableName: string;      // computer-readable, e.g., "rotation_rate"
  displayName: string;       // human-readable, e.g., "Rotation Rate"
  description: string;       // what this variable represents
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
