# Causeway Architecture

## Overview

Causeway is a React-based causal graph editor with AI-assisted proposal generation. It allows users to build, explore, and refine causal models (DAGs) for scientific experiments. The application integrates with Azure OpenAI to generate, assess, and consolidate causal variable proposals.

```
+------------------------------------------------------------------+
|                           App.tsx                                 |
|  (Central State Container - Graph, Proposals, Modes, Tokens)     |
+------------------------------------------------------------------+
        |                    |                      |
        v                    v                      v
+---------------+    +---------------+    +------------------+
| GraphCanvas   |    |   SidePanel   |    |  Modal Wizards   |
| (React Flow)  |    | (Inspection/  |    | - BuildFromData  |
| - Dagre Layout|    |  Actions)     |    | - WhyzenExport   |
| - Node Colors |    |               |    | - AddNode        |
| - Drag & Drop |    +-------+-------+    | - Help           |
+---------------+            |            +------------------+
                             v
                    +------------------+
                    |  ProposalList    |
                    | (Grouped by      |
                    |  Likelihood)     |
                    +------------------+
        |                                          |
        v                                          v
+------------------------------------------------------------------+
|                      services/api.ts                              |
|  - generateAndAssessProposals()   - proposeNodeExpansion()       |
|  - evaluateExistingNodes()        - proposeCondensedNode()       |
|  - generateWhyzenMetadata()       - generatePedagogicalExplanation()|
|  - Token tracking & subscription                                  |
+------------------------------------------------------------------+
        |                                          |
        v                                          v
+------------------------------------------------------------------+
|                   services/graphBuilder.ts                        |
|  - buildGraphFromData()  - critiqueGraph()  - consolidateNodes() |
|  - parseCSVColumns()     - parseExcelColumns()                   |
+------------------------------------------------------------------+
        |
        v
+------------------------------------------------------------------+
|                      Azure OpenAI API                             |
|  (gpt-4o deployment with streaming disabled)                     |
+------------------------------------------------------------------+
```

## Directory Structure

```
causeway/
├── src/
│   ├── App.tsx              # Main application, central state container
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles (Tailwind base)
│   ├── vite-env.d.ts        # Vite environment types
│   │
│   ├── components/          # React UI components
│   │   ├── GraphCanvas.tsx       # React Flow graph visualization
│   │   ├── SidePanel.tsx         # Node inspection and actions panel
│   │   ├── ProposalList.tsx      # AI-generated proposal display
│   │   ├── ContextHeader.tsx     # Experimental context editor
│   │   ├── BuildFromDataWizard.tsx   # Multi-step graph builder wizard
│   │   ├── WhyzenExportWizard.tsx    # Whyzen metadata configuration
│   │   ├── AddNodeModal.tsx      # Manual node creation dialog
│   │   └── HelpModal.tsx         # Application help documentation
│   │
│   ├── services/            # API and business logic
│   │   ├── api.ts                # Azure OpenAI integration, token tracking
│   │   └── graphBuilder.ts       # Build-critique-refine graph construction
│   │
│   ├── types/               # TypeScript interfaces
│   │   └── index.ts              # CausalGraph, CausalNode, Proposal, etc.
│   │
│   ├── utils/               # Graph utilities
│   │   └── graph.ts              # DAG operations, cycle detection, traversal
│   │
│   ├── data/                # Presets and initial data
│   │   ├── initialData.ts        # Experiment presets (RDE, Battery, DFT, etc.)
│   │   └── rde_graph.json        # Full Whyzen RDE model import
│   │
│   └── assets/              # Static assets
│
├── converters/              # Python utilities for Whyzen interop
│   ├── whyzen_to_causeway.py     # Import Whyzen models
│   ├── whyzen_graph_utils.py     # Graph transformation utilities
│   ├── parse_rde_model.py        # Parse RDE structural models
│   ├── topology_validator.py     # DAG validation
│   └── whyzen_glossary.json      # Whyzen type definitions
│
├── public/                  # Static files served directly
├── dist/                    # Production build output
│
├── index.html               # HTML template
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite bundler configuration
├── tsconfig.json            # TypeScript project references
├── tsconfig.app.json        # App TypeScript config
├── tsconfig.node.json       # Node TypeScript config
└── eslint.config.js         # ESLint configuration
```

## Core Concepts

### Type System (`src/types/index.ts`)

#### CausalGraph, CausalNode, CausalEdge

```typescript
interface CausalNode {
  id: string;                    // Unique identifier
  variableName: string;          // Machine-readable (snake_case)
  displayName: string;           // Human-readable
  description: string;           // What this variable represents
  position?: { x: number; y: number };  // React Flow position
  _whyzen?: WhyzenMetadata;      // Optional Whyzen export metadata
}

interface CausalEdge {
  id: string;
  source: string;   // Upstream node (cause)
  target: string;   // Downstream node (effect)
}

interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  experimentalContext: string;  // Domain description paragraph
}
```

#### Proposal System

Proposals represent AI-suggested nodes or connections:

```typescript
interface Proposal {
  id: string;
  variableName: string;
  displayName: string;
  rationale: string;              // 2-3 sentence explanation
  relation: "parent" | "ancestor" | "child" | "descendant";  // Pearl terminology
  status: "pending" | "complete" | "assessing";
  targetNodeId: string;           // Node this relates to
  direction: "upstream" | "downstream";
  likelihood?: "high" | "medium" | "low";  // Critic assessment
  criticReason?: string;          // Assessment explanation
  count?: number;                 // Merge count from consolidation
}
```

**Proposal Lifecycle:**
1. **Generation**: Multiple parallel agents propose new variables with different focus areas
2. **Assessment**: Critic agent evaluates scientific plausibility (high/medium/low)
3. **Consolidation**: Duplicate detection merges similar proposals, incrementing `count`

#### Mode System

The application supports three interaction modes:

| Mode | Purpose | State Variables |
|------|---------|-----------------|
| **Normal** | Standard node selection and proposal generation | `selectedNodeId` |
| **Expand** | Break a single node into a detailed subgraph | `expandMode`, `expandLevel`, `expansionProposal` |
| **Consolidate** | Merge multiple nodes into a single concept | `consolidationMode`, `selectedNodeIds`, `condensedProposal` |

#### WhyzenMetadata

Metadata for export to Whyzen probabilistic programming system:

```typescript
interface WhyzenMetadata {
  node_type: 'RootNode' | 'DeterministicRootNode' | 'Node' | 'DeterministicNode';
  mechanism_type: string | null;  // e.g., 'LinearMechanism', 'SummationMechanism'
  kernel_type: string | null;     // e.g., 'NormalProbabilityKernel', 'GammaProbabilityKernel'
  kernel_params: Record<string, string>;  // e.g., { variance: "1.0" }
  level: 'global' | 'experiment' | 'timepoint';
}
```

## Component Architecture

### App.tsx - Central State Container

`App.tsx` is the main component managing all application state:

**Core State:**
- `graph: CausalGraph` - The current causal model
- `selectedNodeId: string | null` - Currently selected node
- `proposals: Proposal[]` - Generated node proposals
- `existingNodeProposals: ExistingNodeProposal[]` - Evaluated existing nodes

**Mode State:**
- `consolidationMode: boolean` - Multi-select mode for merging nodes
- `selectedNodeIds: Set<string>` - Selected nodes in consolidation mode
- `expandMode: boolean` - Node expansion mode
- `expandLevel: 'light' | 'medium' | 'heavy'` - Expansion complexity

**Derived State (useMemo):**
- `selectedNode` - Full node object for selected ID
- `immediateUpstream` / `higherUpstream` - Ancestor nodes with degrees
- `immediateDownstream` / `higherDownstream` - Descendant nodes with degrees
- `unconnectedUpstream` / `unconnectedDownstream` - Nodes available to connect
- `otherNodes` - Nodes with no path to selected node

### GraphCanvas.tsx - Visualization

Built on React Flow with Dagre auto-layout:

**Key Features:**
- Node coloring based on relationship to selected node:
  - Yellow: Selected node
  - Blue: Parent (immediate upstream)
  - Light blue: Ancestor (higher upstream)
  - Red: Child (immediate downstream)
  - Pink: Descendant (higher downstream)
  - Purple: Selected in consolidation mode
- Drag-and-drop node positioning
- Auto-layout button (top-bottom DAG orientation)
- Position persistence through parent state

### SidePanel.tsx - Node Inspection and Actions

Collapsible sections for node interaction:

1. **Node Details** - Display name, variable name, description, Whyzen metadata
2. **Add Parent/Ancestor** - Evaluate existing nodes, propose new causes
3. **Add Child/Descendant** - Evaluate existing nodes, propose new effects
4. **Remove Connections** - Delete edges from selected node
5. **Causal Graph Context** - View ancestors and descendants

Contains `ProposalList` as child slot for displaying generated proposals.

### Modal Components

| Component | Purpose |
|-----------|---------|
| `BuildFromDataWizard` | Multi-step wizard: upload CSV/Excel, describe context, configure iterations, preview/build graph |
| `WhyzenExportWizard` | Configure node metadata (node type, mechanism, kernel, level) for Whyzen export |
| `AddNodeModal` | Manual node creation with parent/child relationship selection |
| `HelpModal` | Documentation for application features |

## API Layer (`src/services/api.ts`)

### Azure OpenAI Integration

Configuration via environment variables:
```
VITE_AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-api-key
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

Client setup:
```typescript
const client = new AzureOpenAI({
  endpoint: endpoint,
  apiKey: apiKey,
  apiVersion: '2024-08-01-preview',
  dangerouslyAllowBrowser: true  // Required for browser-side API calls
});
```

### Token Tracking System

Global accumulator with subscription pattern:

```typescript
let sessionTokenUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

// Subscribe to updates (used by App.tsx useEffect)
subscribeToTokenUpdates(callback: (usage: TokenUsage) => void): () => void

// Manual controls
getSessionTokenUsage(): TokenUsage
resetSessionTokenUsage(): void
```

### Prompt Engineering Patterns

**Proposal Generation:**
- Full graph context provided (parents, ancestors, children, descendants, other nodes)
- Pearl's causal terminology (parent/ancestor/child/descendant)
- Variation prompts for diversity:
  - Physical/mechanical factors
  - Chemical/material properties
  - Environmental conditions
  - Systemic/procedural factors
- Second round uses orthogonalization prompts

**Critic Assessment:**
- Lower temperature (0.3) for consistent assessments
- Evaluates scientific plausibility
- Checks for conflicts with existing graph
- Returns likelihood (high/medium/low) with reasoning

### Parallel Agent Execution

```typescript
// Generate proposals with configurable parallelism
generateAndAssessProposals(
  experimentalContext,
  selectedNode,
  graphContext,        // { parents, ancestors, children, descendants, otherNodes }
  previousProposals,
  allNodes,
  allEdges,
  onProposalsUpdate,   // Callback for UI updates
  config,              // { numCycles: 2, numProposalsPerCycle: 4 }
  direction            // 'upstream' | 'downstream'
)
```

Flow:
1. For each cycle, generate N proposals in parallel with different variations
2. Assess each proposal with critic (also in parallel)
3. Consolidate duplicates using LLM
4. Call `onProposalsUpdate` with merged list
5. Repeat for configured number of cycles

## Graph Utilities (`src/utils/graph.ts`)

### Core Functions

```typescript
// Node retrieval
getNode(graph, id): CausalNode | null

// Upstream (cause) traversal
getImmediateUpstream(graph, nodeId): CausalNode[]      // Direct parents
getAllUpstream(graph, nodeId): CausalNode[]            // All ancestors
getUpstreamWithDegrees(graph, nodeId): NodeWithDegree[] // With distance

// Downstream (effect) traversal
getImmediateDownstream(graph, nodeId): CausalNode[]
getDownstreamWithDegrees(graph, nodeId): NodeWithDegree[]

// Unconnected nodes
getUnconnectedUpstream(graph, nodeId): CausalNode[]
getUnconnectedDownstream(graph, nodeId): CausalNode[]
```

### Graph Modification (Immutable)

```typescript
// Add operations (return new graph)
addNode(graph, node): CausalGraph
addEdge(graph, sourceId, targetId): CausalGraph
addEdgeSafe(graph, sourceId, targetId): AddEdgeResult  // With cycle check

// Remove operations
removeEdge(graph, sourceId, targetId): CausalGraph

// Validation
wouldCreateCycle(graph, sourceId, targetId): boolean
```

## Data Flow

### Proposal Generation to Graph

```
User clicks "Propose New Parents"
         |
         v
handleGenerateProposals() in App.tsx
         |
         v
generateAndAssessProposals() in api.ts
  - Builds GraphContext from derived state
  - Runs parallel proposal agents
  - Critic assesses each proposal
  - Consolidates duplicates
         |
         v
onProposalsUpdate callback
         |
         v
setProposals() updates state
         |
         v
ProposalList re-renders with grouped proposals
         |
User clicks "+ Add" on proposal
         |
         v
handleAddProposal()
  - Creates CausalNode from Proposal
  - Adds node and edge to graph
  - Removes proposal from list
```

### Expand Mode Flow

```
User enters Expand Mode, selects node
         |
         v
handleProposeExpansion()
         |
         v
proposeNodeExpansion() in api.ts
  - Analyzes current connections
  - Proposes subgraph (nodes + edges)
  - Returns ExpansionProposal
         |
         v
User reviews proposal, clicks "Accept"
         |
         v
handleAcceptExpansion()
  - Removes original node
  - Adds expansion nodes with computed positions
  - Redirects incoming edges to parent nodes
  - Redirects outgoing edges from child nodes
  - Creates internal edges from proposal
```

### Consolidate Mode Flow

```
User enters Consolidate Mode, clicks multiple nodes
         |
         v
handleProposeCondensed()
         |
         v
proposeCondensedNode() in api.ts
  - Analyzes selected nodes
  - Finds internal, incoming, outgoing edges
  - Proposes single condensed node
         |
         v
User reviews, clicks "Accept"
         |
         v
handleAcceptCondensed()
  - Creates condensed node at average position
  - Redirects all edges to/from condensed node
  - Removes original nodes
  - Cleans up self-loops and duplicates
```

### State Management Patterns

The application uses React's built-in state management:

- **useState** for independent state variables
- **useMemo** for expensive derived computations (graph traversal)
- **useCallback** for stable handler references
- **useEffect** for:
  - Token update subscriptions
  - Auto-scroll to proposals during generation

No external state management library (Redux, Zustand, etc.) is used. State is lifted to App.tsx and passed down via props.

## Future Refactoring Notes

### Custom Hooks to Extract

1. **useGraph** - Graph state and modification handlers
   ```typescript
   const { graph, setGraph, addNode, addEdge, removeEdge } = useGraph(initialGraph);
   ```

2. **useGraphTraversal** - Derived relationship data
   ```typescript
   const { parents, ancestors, children, descendants } = useGraphTraversal(graph, selectedNodeId);
   ```

3. **useProposals** - Proposal state and generation
   ```typescript
   const { proposals, isGenerating, generateProposals, addProposal } = useProposals();
   ```

4. **useMode** - Mode management (normal/expand/consolidate)
   ```typescript
   const { mode, enterExpandMode, enterConsolidateMode, exitMode } = useMode();
   ```

5. **useTokenTracking** - Token usage subscription
   ```typescript
   const { tokenUsage, resetTokens } = useTokenTracking();
   ```

### Shared Components to Create

1. **Spinner** - Currently duplicated in multiple components
2. **LikelihoodBadge** - Likelihood styling shared between ProposalList and SidePanel
3. **CollapsibleSection** - Currently in SidePanel, could be shared
4. **NodeChip** - Node display with relationship coloring
5. **ConfirmButton** - Double-click confirmation pattern (used in New Graph button)

### Quality Audit Findings

1. **App.tsx size** - At 1130+ lines, should be split into smaller modules
2. **API client duplication** - `AzureOpenAI` client created in both `api.ts` and `graphBuilder.ts`
3. **Token tracking** - Separate tracking in `graphBuilder.ts` vs shared in `api.ts`
4. **Validation duplication** - JSON response validation logic repeated across functions
5. **Type assertions** - Some `as` casts could be replaced with type guards
6. **Error handling** - Inconsistent error message formatting across components

### Suggested Refactoring Priority

1. Extract custom hooks from App.tsx (reduces file size, improves testability)
2. Unify API client configuration (single source of truth)
3. Create shared UI components library (reduces duplication)
4. Add comprehensive type guards for API responses
5. Implement proper error boundary components
