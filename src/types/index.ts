// Causal node representing a factor in the experiment
export interface CausalNode {
  id: string;
  variableName: string;      // computer-readable, e.g., "rotation_rate"
  displayName: string;       // human-readable, e.g., "Rotation Rate"
  description: string;       // what this variable represents
  // Position for react-flow
  position?: { x: number; y: number };
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
