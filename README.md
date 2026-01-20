# Causeway

AI-assisted causal graph builder using Pearl's causal inference terminology.

![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)

---

## Overview

Causeway is an interactive tool for building and refining causal directed acyclic graphs (DAGs) with AI assistance. It helps researchers and scientists construct causal models by:

- **Proposing new causal relationships** using multiple parallel AI agents
- **Critically assessing proposals** for scientific plausibility
- **Using Pearl's causal terminology** (parents, ancestors, children, descendants) for precise communication
- **Supporting iterative refinement** through consolidation and expansion operations

The tool is designed for experimental scientists who need to model causal relationships between variables, with a particular focus on scientific domains where understanding cause-and-effect is essential.

---

## Features

### Build from Data Wizard

Upload a CSV or Excel file containing your experimental data columns, and Causeway will propose an initial causal graph structure:

- **CSV/Excel parsing**: Automatically extracts column names from uploaded files
- **Manual column entry**: Add columns and descriptions by hand
- **Iterative AI refinement**: Choose from fast (1 iteration), balanced (2 iterations), or heavy (4+ iterations) generation modes
- **Real-time preview**: See the proposed graph in the main canvas while the wizard is open
- **Refine More**: Continue iterating on the generated graph with additional refinement cycles

### Node Proposal System

Generate new node proposals using a multi-agent approach:

- **Parallel AI agents**: Multiple agents propose causes/effects simultaneously with different focus areas (physical, chemical, environmental, procedural factors)
- **Critic consolidation**: A critic agent assesses each proposal's scientific plausibility (high/medium/low likelihood)
- **Multiplicity counts**: When multiple agents propose the same concept, the count is tracked to indicate confidence
- **Orthogonalization**: Subsequent cycles are prompted to propose different concepts from previous rounds
- **Bidirectional proposals**: Generate upstream causes (parents/ancestors) or downstream effects (children/descendants)

### Expand Mode

Break a single node into a detailed subgraph:

- **Expansion levels**: Light (2-3 nodes), Medium (3-5 nodes), or Heavy (5-8 nodes)
- **Role assignment**: Expanded nodes are categorized as parents (upstream), children (downstream), or internal (mediators)
- **Connection preservation**: Existing graph connections are automatically redirected to the appropriate expanded nodes
- **Optional hints**: Provide guidance like "focus on molecular mechanisms" or "include temporal factors"

### Consolidate Mode

Merge multiple related nodes into a single higher-level concept:

- **Multi-select**: Click nodes to add them to the consolidation set
- **AI-proposed naming**: The AI suggests an appropriate name and description for the merged concept
- **Edge preservation**: All incoming and outgoing edges are preserved and redirected
- **Optional hints**: Guide the naming with hints like "name it based on function"

### Whyzen Export

Export your causal graph with metadata for use with the Whyzen causal inference framework:

- **Node type configuration**: RootNode, DeterministicRootNode, Node, DeterministicNode
- **Mechanism types**: Linear, Summation, Product, Division, Sigmoid, Neural Network, and more
- **Kernel types**: Normal, LogNormal, Gamma, Beta, Bernoulli, and other probability distributions
- **Level specification**: Global, Experiment, or Timepoint granularity
- **AI-assisted fill**: Automatically suggest metadata for incomplete nodes
- **Validation**: Visual indicators show which nodes are complete vs. incomplete

### Pedagogical Explanations

Click the magnifying glass icon on any node or proposal to get an AI-generated educational explanation:

- **Context-aware**: Explanations are grounded in your specific experimental context
- **Three-paragraph format**: What it is, how it's measured, and its causal role
- **Related nodes**: Summary of connections to other nodes in your graph
- **Bold highlighting**: Related node names are highlighted in the explanation text

### Graph Manipulation

Full control over your causal graph structure:

- **Add nodes**: Create new nodes with display name, variable name, and description
- **Add edges**: Connect nodes with causal relationships (with cycle detection)
- **Remove edges**: Disconnect nodes while preserving the nodes themselves
- **Node selection**: Click nodes to view details and available operations
- **Position persistence**: Node positions are saved with the graph

### Pearl's Causal Terminology

The interface uses Judea Pearl's standard causal inference terminology:

- **Parents**: Direct causes (one edge away upstream)
- **Ancestors**: Indirect causes (multiple edges away upstream)
- **Children**: Direct effects (one edge away downstream)
- **Descendants**: Indirect effects (multiple edges away downstream)

Nodes are color-coded by their relationship to the selected node, making the causal structure visually clear.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Azure OpenAI API access

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd causeway
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root with your Azure OpenAI credentials:

```env
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-api-key
VITE_AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint URL | Yes |
| `VITE_AZURE_OPENAI_API_KEY` | Azure OpenAI API key | Yes |
| `VITE_AZURE_OPENAI_DEPLOYMENT` | Deployment name (defaults to `gpt-4o`) | No |

---

## Usage

### Building a Graph from Scratch

1. Click **Build from Data** to open the wizard
2. Enter your experimental context (describe your experiment/domain)
3. Upload a CSV/Excel file or manually enter column names
4. Choose a generation mode and click **Generate**
5. Review the proposed graph and click **Accept** or **Refine More**

### Exploring Causal Relationships

1. Click a node to select it
2. View its parents, ancestors, children, and descendants in the side panel
3. Click **Propose New Parents** to generate upstream cause suggestions
4. Click **Propose New Children** to generate downstream effect suggestions
5. Review proposals by likelihood (Likely, Possible, Unlikely)
6. Click **+ Add** to accept a proposal

### Refining the Graph

**To expand a node:**
1. Select the node and click **Expand**
2. Choose an expansion level (light/medium/heavy)
3. Optionally add a hint
4. Click **Propose**, review, and **Accept**

**To consolidate nodes:**
1. Click **Consolidate** to enter consolidation mode
2. Click multiple nodes to select them
3. Optionally add a hint
4. Click **Propose**, review, and **Accept**

### Exporting

- Click **Save** to download the graph as JSON
- Click **Whyzen** to configure metadata and export for Whyzen

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tool and dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |
| [React Flow (@xyflow/react)](https://reactflow.dev/) | Graph visualization |
| [Dagre](https://github.com/dagrejs/dagre) | Graph layout algorithms |
| [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) | AI capabilities |
| [ExcelJS](https://github.com/exceljs/exceljs) | Excel file parsing |

---

## Project Structure

```
src/
  App.tsx              # Main application component
  components/
    GraphCanvas.tsx    # React Flow graph visualization
    SidePanel.tsx      # Node details and actions
    ProposalList.tsx   # AI proposal display
    BuildFromDataWizard.tsx  # CSV/Excel import wizard
    WhyzenExportWizard.tsx   # Whyzen metadata configuration
    AddNodeModal.tsx   # Manual node creation
    HelpModal.tsx      # Help documentation
    ContextHeader.tsx  # Experimental context editor
  services/
    api.ts             # Azure OpenAI integration
    graphBuilder.ts    # Graph generation from data
  types/
    index.ts           # TypeScript interfaces
  utils/
    graph.ts           # Graph manipulation utilities
  data/
    initialData.ts     # Preset graphs and examples
```

---

## License

This project is proprietary. All rights reserved.

---

## Credits

Credit to conversations with Amanda Volk and Kevin Tran for the original idea.
