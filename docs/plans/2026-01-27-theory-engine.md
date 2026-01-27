# Theory Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Theory Engine" interface alongside the Causeway graph that enables users to classify nodes (Intervenable/Observable/Desirable), define action spaces, and generate AI-powered scientific hypotheses with causal rationales.

**Architecture:** Split-pane layout (40% Theory Engine / 60% Graph). Node classifications stored on CausalNode with custom React Flow shapes. Hypotheses are first-class objects with graph node references, auto-saved to localStorage, and marked outdated when referenced nodes change. LLM integration via existing Azure OpenAI + optional Ollama.

**Tech Stack:** React + TypeScript, React Flow custom nodes, Tailwind CSS, Azure OpenAI / Ollama

---

## Phase 1: Layout Infrastructure

### Task 1.1: Create Split-Pane Layout

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/TheoryEnginePanel.tsx`

**Step 1: Create TheoryEnginePanel shell component**

```typescript
// src/components/TheoryEnginePanel.tsx
import React from 'react';

interface TheoryEnginePanelProps {
  experimentalContext: string;
}

export function TheoryEnginePanel({ experimentalContext }: TheoryEnginePanelProps) {
  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Theory Engine</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-gray-500 text-sm">Hypothesis generation coming soon...</p>
      </div>
    </div>
  );
}
```

**Step 2: Run TypeScript check**

Run: `cd /Users/steventorrisi/Documents/Projects/MadSciFri/theory_engine && npx tsc --noEmit`
Expected: No errors

**Step 3: Modify App.tsx to use split layout**

In `src/App.tsx`, wrap the main content in a flex container:

```typescript
// Replace the outermost div structure with:
<div className="h-screen flex">
  {/* Left Panel - Theory Engine (40%) */}
  <div className="w-2/5 h-full">
    <TheoryEnginePanel experimentalContext={graph.experimentalContext} />
  </div>

  {/* Right Panel - Graph (60%) */}
  <div className="w-3/5 h-full flex flex-col">
    {/* Existing ContextHeader, GraphCanvas, SidePanel layout */}
  </div>
</div>
```

**Step 4: Run dev server and verify layout**

Run: `cd /Users/steventorrisi/Documents/Projects/MadSciFri/theory_engine && npm run dev`
Expected: App renders with 40/60 split, Theory Engine header on left

**Step 5: Commit**

```bash
git add src/components/TheoryEnginePanel.tsx src/App.tsx
git commit -m "feat: add split-pane layout with Theory Engine panel

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Node Classification System

### Task 2.1: Add Classification Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add NodeClassification type**

```typescript
// Add to src/types/index.ts

export type NodeClassification = 'intervenable' | 'observable' | 'desirable' | null;

// Extend CausalNode interface - add after description field:
export interface CausalNode {
  id: string;
  variableName: string;
  displayName: string;
  description: string;
  position?: { x: number; y: number };
  classification?: NodeClassification;  // NEW
  isDesirable?: boolean;  // NEW - allows O+D combo
  _whyzen?: WhyzenMetadata;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add node classification types (I/O/D)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.2: Create Custom Node Shapes

**Files:**
- Create: `src/components/ClassifiedNode.tsx`
- Modify: `src/components/GraphCanvas.tsx`

**Step 1: Create ClassifiedNode component with shape rendering**

```typescript
// src/components/ClassifiedNode.tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ClassifiedNodeData {
  label: string;
  classification?: 'intervenable' | 'observable' | 'desirable' | null;
  isDesirable?: boolean;
  isSelected?: boolean;
  relationshipColor?: string;
}

function ClassifiedNode({ data }: NodeProps<ClassifiedNodeData>) {
  const { label, classification, isDesirable, isSelected, relationshipColor } = data;

  // Determine shape and styling
  const isObservableAndDesirable = classification === 'observable' && isDesirable;

  const getShapeStyles = () => {
    const baseColor = relationshipColor || (isSelected ? '#fbbf24' : '#ffffff');

    if (classification === 'intervenable') {
      // Triangle - use clip-path
      return {
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: baseColor,
        border: '2px solid #374151',
      };
    }

    if (isObservableAndDesirable) {
      // Gold star with special border
      return {
        backgroundColor: '#fcd34d',
        border: '3px solid #b45309',
        borderRadius: '0',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      };
    }

    if (isDesirable || classification === 'desirable') {
      // Star shape
      return {
        backgroundColor: baseColor,
        border: '2px solid #374151',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      };
    }

    if (classification === 'observable') {
      // Circle
      return {
        backgroundColor: baseColor,
        border: '2px solid #374151',
        borderRadius: '50%',
      };
    }

    // Default rectangle
    return {
      backgroundColor: baseColor,
      border: '2px solid #374151',
      borderRadius: '4px',
    };
  };

  return (
    <div
      className="px-4 py-2 min-w-[80px] min-h-[40px] flex items-center justify-center text-center"
      style={getShapeStyles()}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
        {label}
      </span>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}

export default memo(ClassifiedNode);
```

**Step 2: Register custom node type in GraphCanvas**

In `src/components/GraphCanvas.tsx`, add:

```typescript
import ClassifiedNode from './ClassifiedNode';

// Add nodeTypes object before the component
const nodeTypes = {
  classified: ClassifiedNode,
};

// In the ReactFlow component, add nodeTypes prop:
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  // ... other props
/>
```

**Step 3: Update node conversion to use classified type and pass data**

In `GraphCanvas.tsx`, modify the node mapping to use the new type:

```typescript
const flowNodes = graph.nodes.map((node) => ({
  id: node.id,
  type: 'classified',
  position: node.position || { x: 0, y: 0 },
  data: {
    label: node.displayName,
    classification: node.classification,
    isDesirable: node.isDesirable,
    isSelected: node.id === selectedNodeId,
    relationshipColor: getNodeColor(node.id), // existing color logic
  },
}));
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Run dev server and verify shapes render**

Run: `npm run dev`
Expected: Nodes render (default rectangle for now since no classifications set)

**Step 6: Commit**

```bash
git add src/components/ClassifiedNode.tsx src/components/GraphCanvas.tsx
git commit -m "feat: add custom node shapes for I/O/D classifications

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2.3: Add Classification Controls to Theory Engine

**Files:**
- Modify: `src/components/TheoryEnginePanel.tsx`
- Modify: `src/App.tsx`

**Step 1: Create NodeClassifier section in TheoryEnginePanel**

```typescript
// src/components/TheoryEnginePanel.tsx
import React from 'react';
import type { CausalNode, CausalGraph, NodeClassification } from '../types';

interface TheoryEnginePanelProps {
  graph: CausalGraph;
  selectedNodeId: string | null;
  onClassifyNode: (nodeId: string, classification: NodeClassification, isDesirable?: boolean) => void;
}

export function TheoryEnginePanel({ graph, selectedNodeId, onClassifyNode }: TheoryEnginePanelProps) {
  const selectedNode = graph.nodes.find(n => n.id === selectedNodeId);

  // Group nodes by classification
  const intervenables = graph.nodes.filter(n => n.classification === 'intervenable');
  const observables = graph.nodes.filter(n => n.classification === 'observable');
  const desirables = graph.nodes.filter(n => n.isDesirable);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Theory Engine</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Node Classification Section */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Node Classification</h2>

          {selectedNode ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-medium">{selectedNode.displayName}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onClassifyNode(selectedNode.id, 'intervenable')}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedNode.classification === 'intervenable'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ▲ Intervenable
                </button>
                <button
                  onClick={() => onClassifyNode(selectedNode.id, 'observable')}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedNode.classification === 'observable'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ● Observable
                </button>
                <button
                  onClick={() => onClassifyNode(selectedNode.id, null, !selectedNode.isDesirable)}
                  className={`px-3 py-1 text-xs rounded ${
                    selectedNode.isDesirable
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ★ Desirable
                </button>
                <button
                  onClick={() => onClassifyNode(selectedNode.id, null, false)}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Select a node to classify</p>
          )}
        </div>

        {/* Classification Summary */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Classified Nodes</h2>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-blue-600 font-medium">▲ Intervenables:</span>{' '}
              {intervenables.length > 0
                ? intervenables.map(n => n.displayName).join(', ')
                : <span className="text-gray-400">None</span>}
            </div>
            <div>
              <span className="text-green-600 font-medium">● Observables:</span>{' '}
              {observables.length > 0
                ? observables.map(n => n.displayName).join(', ')
                : <span className="text-gray-400">None</span>}
            </div>
            <div>
              <span className="text-yellow-600 font-medium">★ Desirables:</span>{' '}
              {desirables.length > 0
                ? desirables.map(n => n.displayName).join(', ')
                : <span className="text-gray-400">None</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Add classification handler to App.tsx**

```typescript
// Add to App.tsx

const handleClassifyNode = useCallback((
  nodeId: string,
  classification: NodeClassification,
  isDesirable?: boolean
) => {
  setGraph(prevGraph => ({
    ...prevGraph,
    nodes: prevGraph.nodes.map(node => {
      if (node.id !== nodeId) return node;

      // If setting desirable only, preserve existing classification
      if (classification === null && isDesirable !== undefined) {
        return { ...node, isDesirable };
      }

      // If setting I, clear desirable (I can't be D)
      if (classification === 'intervenable') {
        return { ...node, classification, isDesirable: false };
      }

      // If setting O or clearing, preserve desirable state
      return { ...node, classification, isDesirable: isDesirable ?? node.isDesirable };
    }),
  }));
}, []);
```

**Step 3: Pass props to TheoryEnginePanel**

```typescript
<TheoryEnginePanel
  graph={graph}
  selectedNodeId={selectedNodeId}
  onClassifyNode={handleClassifyNode}
/>
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Test classification flow**

Run: `npm run dev`
Expected: Click node → Classification buttons appear → Click to classify → Shape changes

**Step 6: Commit**

```bash
git add src/components/TheoryEnginePanel.tsx src/App.tsx
git commit -m "feat: add node classification controls with I/O/D buttons

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 3: Action Space Definition

### Task 3.1: Add Action Space Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add ActionSpace types**

```typescript
// Add to src/types/index.ts

export interface ActionDefinition {
  id: string;
  name: string;  // e.g., "Molecular Dynamics Run", "Literature Search"
  type: 'md_simulation' | 'experiment' | 'literature' | 'dataset' | 'custom';
  description: string;  // What this action can tell us
  parameterHints?: string[];  // e.g., ["temperature", "duration", "structure"]
}

export interface ActionSpace {
  actions: ActionDefinition[];
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add ActionSpace and ActionDefinition types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3.2: Create Action Space Editor

**Files:**
- Create: `src/components/ActionSpaceEditor.tsx`
- Modify: `src/components/TheoryEnginePanel.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ActionSpaceEditor component**

```typescript
// src/components/ActionSpaceEditor.tsx
import React, { useState } from 'react';
import type { ActionSpace, ActionDefinition } from '../types';

interface ActionSpaceEditorProps {
  actionSpace: ActionSpace;
  onUpdate: (actionSpace: ActionSpace) => void;
}

const ACTION_TYPES = [
  { value: 'md_simulation', label: 'MD Simulation', defaultHints: ['temperature', 'duration', 'structure'] },
  { value: 'experiment', label: 'Experiment', defaultHints: ['method', 'conditions', 'samples'] },
  { value: 'literature', label: 'Literature Search', defaultHints: ['keywords', 'databases'] },
  { value: 'dataset', label: 'Dataset Query', defaultHints: ['dataset_name', 'query_type'] },
  { value: 'custom', label: 'Custom', defaultHints: [] },
] as const;

export function ActionSpaceEditor({ actionSpace, onUpdate }: ActionSpaceEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ActionDefinition['type']>('custom');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;

    const typeConfig = ACTION_TYPES.find(t => t.value === newType);
    const newAction: ActionDefinition = {
      id: `action-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      description: newDescription.trim(),
      parameterHints: typeConfig?.defaultHints || [],
    };

    onUpdate({
      actions: [...actionSpace.actions, newAction],
    });

    setNewName('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleRemove = (actionId: string) => {
    onUpdate({
      actions: actionSpace.actions.filter(a => a.id !== actionId),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Action Space</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          + Add Action
        </button>
      </div>

      {actionSpace.actions.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">No actions defined. Add actions to enable hypothesis validation.</p>
      )}

      {actionSpace.actions.map(action => (
        <div key={action.id} className="bg-white rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium text-gray-800">{action.name}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {ACTION_TYPES.find(t => t.value === action.type)?.label}
              </span>
            </div>
            <button
              onClick={() => handleRemove(action.id)}
              className="text-gray-400 hover:text-red-500 text-xs"
            >
              ×
            </button>
          </div>
          {action.description && (
            <p className="text-xs text-gray-500 mt-1">{action.description}</p>
          )}
          {action.parameterHints && action.parameterHints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {action.parameterHints.map(hint => (
                <span key={hint} className="text-xs px-1 bg-blue-50 text-blue-600 rounded">
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {isAdding && (
        <div className="bg-blue-50 rounded border border-blue-200 p-3 space-y-2">
          <input
            type="text"
            placeholder="Action name (e.g., 'Matlantis MD Run')"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as ActionDefinition['type'])}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          >
            {ACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add actionSpace state to App.tsx**

```typescript
// Add to App.tsx state
const [actionSpace, setActionSpace] = useState<ActionSpace>({ actions: [] });

// Add to auto-save effect (extend existing localStorage save)
// Add to recovery logic
```

**Step 3: Add ActionSpaceEditor to TheoryEnginePanel**

```typescript
import { ActionSpaceEditor } from './ActionSpaceEditor';

// Add to props interface
actionSpace: ActionSpace;
onActionSpaceUpdate: (actionSpace: ActionSpace) => void;

// Add to render, after Classification Summary section
<div className="p-4 border-b border-gray-200">
  <ActionSpaceEditor
    actionSpace={actionSpace}
    onUpdate={onActionSpaceUpdate}
  />
</div>
```

**Step 4: Pass props from App.tsx**

```typescript
<TheoryEnginePanel
  graph={graph}
  selectedNodeId={selectedNodeId}
  onClassifyNode={handleClassifyNode}
  actionSpace={actionSpace}
  onActionSpaceUpdate={setActionSpace}
/>
```

**Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Test action space flow**

Run: `npm run dev`
Expected: Can add/remove actions with different types

**Step 7: Commit**

```bash
git add src/components/ActionSpaceEditor.tsx src/components/TheoryEnginePanel.tsx src/App.tsx
git commit -m "feat: add action space editor for defining validation sources

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 4: Hypothesis Types and Generation

### Task 4.1: Add Hypothesis Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add Hypothesis types**

```typescript
// Add to src/types/index.ts

export interface HypothesisActionHook {
  actionId: string;  // References ActionDefinition.id
  actionName: string;
  parameters: Record<string, string>;  // Filled based on parameterHints
  instructions: string;  // Natural language instructions for agents
}

export interface Hypothesis {
  id: string;
  createdAt: string;  // ISO timestamp

  // Node references
  intervenables: string[];  // Node IDs classified as I
  observables: string[];    // Node IDs classified as O
  desirables: string[];     // Node IDs classified as D (optional)

  // Hypothesis content
  prescription: string;     // What to do with I variables
  predictions: {
    observables: string;    // What will happen to O variables
    desirables: string;     // How D variables will be influenced
  };
  story: string;            // Causal chain explanation

  // Validation
  actionHooks: HypothesisActionHook[];
  critique: string;         // Auto-generated critique

  // Status
  status: 'active' | 'outdated';
  outdatedReason?: string;  // Which node changed
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Hypothesis and HypothesisActionHook types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Add Hypothesis Generation LLM Function

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add generateHypothesis function**

```typescript
// Add to src/services/api.ts

export interface HypothesisGenerationInput {
  experimentalContext: string;
  graph: CausalGraph;
  intervenables: CausalNode[];
  observables: CausalNode[];
  desirables: CausalNode[];
  actionSpace: ActionSpace;
}

export interface GeneratedHypothesis {
  prescription: string;
  predictions: {
    observables: string;
    desirables: string;
  };
  story: string;
  actionHooks: Array<{
    actionId: string;
    parameters: Record<string, string>;
    instructions: string;
  }>;
  critique: string;
}

export async function generateHypothesis(
  input: HypothesisGenerationInput
): Promise<GeneratedHypothesis> {
  const client = getClient();

  // Build graph context for causal reasoning
  const nodeMap = new Map(input.graph.nodes.map(n => [n.id, n]));

  const getAncestors = (nodeId: string): string[] => {
    const ancestors: string[] = [];
    const visited = new Set<string>();
    const queue = input.graph.edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      ancestors.push(current);
      input.graph.edges
        .filter(e => e.target === current)
        .forEach(e => queue.push(e.source));
    }
    return ancestors;
  };

  const getDescendants = (nodeId: string): string[] => {
    const descendants: string[] = [];
    const visited = new Set<string>();
    const queue = input.graph.edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      descendants.push(current);
      input.graph.edges
        .filter(e => e.source === current)
        .forEach(e => queue.push(e.target));
    }
    return descendants;
  };

  const prompt = `You are a scientific hypothesis generator. Given a causal graph and classified variables, generate a testable hypothesis.

EXPERIMENTAL CONTEXT:
${input.experimentalContext}

CAUSAL GRAPH NODES:
${input.graph.nodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n')}

CAUSAL RELATIONSHIPS:
${input.graph.edges.map(e => {
  const source = nodeMap.get(e.source);
  const target = nodeMap.get(e.target);
  return `- ${source?.displayName} → ${target?.displayName}`;
}).join('\n')}

INTERVENABLE VARIABLES (can be manipulated):
${input.intervenables.map(n => {
  const descendants = getDescendants(n.id).map(id => nodeMap.get(id)?.displayName).filter(Boolean);
  return `- ${n.displayName}: ${n.description}\n  Downstream effects: ${descendants.join(', ') || 'None'}`;
}).join('\n')}

OBSERVABLE VARIABLES (can be measured):
${input.observables.map(n => {
  const ancestors = getAncestors(n.id).map(id => nodeMap.get(id)?.displayName).filter(Boolean);
  return `- ${n.displayName}: ${n.description}\n  Upstream causes: ${ancestors.join(', ') || 'None'}`;
}).join('\n')}

DESIRABLE VARIABLES (goals):
${input.desirables.length > 0
  ? input.desirables.map(n => `- ${n.displayName}: ${n.description}`).join('\n')
  : 'None specified'}

AVAILABLE VALIDATION ACTIONS:
${input.actionSpace.actions.map(a =>
  `- ${a.name} (${a.type}): ${a.description}\n  Parameters: ${a.parameterHints?.join(', ') || 'None'}`
).join('\n')}

Generate a hypothesis with:
1. PRESCRIPTION: Specific modifications to the intervenable variables
2. OBSERVABLE_PREDICTIONS: What changes will be observed
3. DESIRABLE_PREDICTIONS: How desirable outcomes will be affected
4. STORY: A causal chain explanation using the graph relationships (cite specific nodes and paths)
5. ACTION_HOOKS: For each relevant action, provide specific parameters and instructions
6. CRITIQUE: Potential weaknesses or assumptions in this hypothesis

Respond in JSON format:
{
  "prescription": "...",
  "predictions": {
    "observables": "...",
    "desirables": "..."
  },
  "story": "...",
  "actionHooks": [
    {
      "actionId": "...",
      "parameters": { "param1": "value1" },
      "instructions": "..."
    }
  ],
  "critique": "..."
}`;

  const response = await client.chat.completions.create({
    model: getApiConfig().deploymentName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from LLM');

  // Track tokens
  if (response.usage) {
    addTokenUsage(response.usage.prompt_tokens, response.usage.completion_tokens);
  }

  // Parse JSON response
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as GeneratedHypothesis;

  return parsed;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (may need to import types)

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add generateHypothesis LLM function with causal reasoning

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4.3: Create Hypothesis Generation UI

**Files:**
- Create: `src/components/HypothesisGenerator.tsx`
- Modify: `src/components/TheoryEnginePanel.tsx`

**Step 1: Create HypothesisGenerator component**

```typescript
// src/components/HypothesisGenerator.tsx
import React, { useState } from 'react';
import type { CausalGraph, ActionSpace, Hypothesis } from '../types';
import { generateHypothesis } from '../services/api';

interface HypothesisGeneratorProps {
  graph: CausalGraph;
  actionSpace: ActionSpace;
  onHypothesisGenerated: (hypothesis: Hypothesis) => void;
}

export function HypothesisGenerator({
  graph,
  actionSpace,
  onHypothesisGenerated
}: HypothesisGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervenables = graph.nodes.filter(n => n.classification === 'intervenable');
  const observables = graph.nodes.filter(n => n.classification === 'observable');
  const desirables = graph.nodes.filter(n => n.isDesirable);

  const canGenerate = observables.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateHypothesis({
        experimentalContext: graph.experimentalContext,
        graph,
        intervenables,
        observables,
        desirables,
        actionSpace,
      });

      const hypothesis: Hypothesis = {
        id: `hyp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        intervenables: intervenables.map(n => n.id),
        observables: observables.map(n => n.id),
        desirables: desirables.map(n => n.id),
        prescription: result.prescription,
        predictions: result.predictions,
        story: result.story,
        actionHooks: result.actionHooks.map(hook => ({
          ...hook,
          actionName: actionSpace.actions.find(a => a.id === hook.actionId)?.name || 'Unknown',
        })),
        critique: result.critique,
        status: 'active',
      };

      onHypothesisGenerated(hypothesis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hypothesis');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Hypothesis Generation</h2>

      {/* Summary of selected nodes */}
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">▲ I:</span>
          <span className={intervenables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {intervenables.length > 0
              ? intervenables.map(n => n.displayName).join(', ')
              : 'None selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">● O:</span>
          <span className={observables.length > 0 ? 'text-gray-700' : 'text-red-400'}>
            {observables.length > 0
              ? observables.map(n => n.displayName).join(', ')
              : 'Required - select at least one'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-600">★ D:</span>
          <span className={desirables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {desirables.length > 0
              ? desirables.map(n => n.displayName).join(', ')
              : 'None selected (optional)'}
          </span>
        </div>
      </div>

      {/* Action space check */}
      {actionSpace.actions.length === 0 && (
        <p className="text-xs text-amber-600">
          No actions defined. Hypotheses will be generated without validation hooks.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={`w-full py-2 px-4 rounded text-sm font-medium ${
          canGenerate && !isGenerating
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Hypothesis'}
      </button>
    </div>
  );
}
```

**Step 2: Add HypothesisGenerator to TheoryEnginePanel**

```typescript
// Add to TheoryEnginePanel props
hypotheses: Hypothesis[];
onHypothesisGenerated: (hypothesis: Hypothesis) => void;

// Add import
import { HypothesisGenerator } from './HypothesisGenerator';

// Add after Action Space section
<div className="p-4 border-b border-gray-200">
  <HypothesisGenerator
    graph={graph}
    actionSpace={actionSpace}
    onHypothesisGenerated={onHypothesisGenerated}
  />
</div>
```

**Step 3: Add hypotheses state to App.tsx**

```typescript
// Add state
const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);

// Add handler
const handleHypothesisGenerated = useCallback((hypothesis: Hypothesis) => {
  setHypotheses(prev => [...prev, hypothesis]);
}, []);

// Pass to TheoryEnginePanel
hypotheses={hypotheses}
onHypothesisGenerated={handleHypothesisGenerated}
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Test hypothesis generation**

Run: `npm run dev`
Expected: Classify nodes as O, click Generate, hypothesis appears

**Step 6: Commit**

```bash
git add src/components/HypothesisGenerator.tsx src/components/TheoryEnginePanel.tsx src/App.tsx
git commit -m "feat: add hypothesis generation UI with I/O/D node selection

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 5: Hypothesis Proposals Display

### Task 5.1: Create Hypothesis Card Component

**Files:**
- Create: `src/components/HypothesisCard.tsx`

**Step 1: Create HypothesisCard component**

```typescript
// src/components/HypothesisCard.tsx
import React, { useState } from 'react';
import type { Hypothesis, CausalGraph } from '../types';

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  graph: CausalGraph;
  onRefresh: (hypothesisId: string) => void;
  onDelete: (hypothesisId: string) => void;
  onExport: (hypothesis: Hypothesis) => void;
}

export function HypothesisCard({
  hypothesis,
  graph,
  onRefresh,
  onDelete,
  onExport
}: HypothesisCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getNodeName = (id: string) =>
    graph.nodes.find(n => n.id === id)?.displayName || 'Unknown';

  const isOutdated = hypothesis.status === 'outdated';

  return (
    <div className={`rounded border ${
      isOutdated ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isOutdated && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                  Outdated
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(hypothesis.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">
              {hypothesis.prescription}
            </p>
          </div>
          <span className="text-gray-400 text-sm ml-2">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
          {/* Node references */}
          <div className="pt-3 space-y-1 text-xs">
            <div>
              <span className="text-blue-600 font-medium">Intervenables:</span>{' '}
              {hypothesis.intervenables.map(getNodeName).join(', ') || 'None'}
            </div>
            <div>
              <span className="text-green-600 font-medium">Observables:</span>{' '}
              {hypothesis.observables.map(getNodeName).join(', ')}
            </div>
            <div>
              <span className="text-yellow-600 font-medium">Desirables:</span>{' '}
              {hypothesis.desirables.map(getNodeName).join(', ') || 'None'}
            </div>
          </div>

          {/* Predictions */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-600">Observable Predictions:</span>
              <p className="text-sm text-gray-700">{hypothesis.predictions.observables}</p>
            </div>
            {hypothesis.predictions.desirables && (
              <div>
                <span className="text-xs font-medium text-gray-600">Desirable Predictions:</span>
                <p className="text-sm text-gray-700">{hypothesis.predictions.desirables}</p>
              </div>
            )}
          </div>

          {/* Story */}
          <div>
            <span className="text-xs font-medium text-gray-600">Causal Story:</span>
            <p className="text-sm text-gray-700 italic">{hypothesis.story}</p>
          </div>

          {/* Action Hooks */}
          {hypothesis.actionHooks.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600">Validation Actions:</span>
              <div className="mt-1 space-y-2">
                {hypothesis.actionHooks.map((hook, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="font-medium text-gray-700">{hook.actionName}</div>
                    {Object.entries(hook.parameters).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(hook.parameters).map(([k, v]) => (
                          <span key={k} className="px-1 bg-blue-100 text-blue-700 rounded">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-gray-600">{hook.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critique */}
          <div>
            <span className="text-xs font-medium text-gray-600">Critique:</span>
            <p className="text-sm text-red-700">{hypothesis.critique}</p>
          </div>

          {/* Outdated reason */}
          {isOutdated && hypothesis.outdatedReason && (
            <p className="text-xs text-amber-700">
              Outdated because: {hypothesis.outdatedReason}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {isOutdated && (
              <button
                onClick={() => onRefresh(hypothesis.id)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Refresh
              </button>
            )}
            <button
              onClick={() => onExport(hypothesis)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Export Instructions
            </button>
            <button
              onClick={() => onDelete(hypothesis.id)}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/HypothesisCard.tsx
git commit -m "feat: add HypothesisCard component with full hypothesis display

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5.2: Create Hypothesis Proposals Section

**Files:**
- Create: `src/components/HypothesisProposals.tsx`
- Modify: `src/components/TheoryEnginePanel.tsx`

**Step 1: Create HypothesisProposals component**

```typescript
// src/components/HypothesisProposals.tsx
import React from 'react';
import type { Hypothesis, CausalGraph } from '../types';
import { HypothesisCard } from './HypothesisCard';

interface HypothesisProposalsProps {
  hypotheses: Hypothesis[];
  graph: CausalGraph;
  onRefresh: (hypothesisId: string) => void;
  onDelete: (hypothesisId: string) => void;
  onExport: (hypothesis: Hypothesis) => void;
}

export function HypothesisProposals({
  hypotheses,
  graph,
  onRefresh,
  onDelete,
  onExport
}: HypothesisProposalsProps) {
  const activeHypotheses = hypotheses.filter(h => h.status === 'active');
  const outdatedHypotheses = hypotheses.filter(h => h.status === 'outdated');

  if (hypotheses.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Hypothesis Proposals</h2>
        <p className="text-xs text-gray-400">
          No hypotheses generated yet. Classify nodes and generate hypotheses above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Hypothesis Proposals</h2>
        <span className="text-xs text-gray-400">
          {activeHypotheses.length} active, {outdatedHypotheses.length} outdated
        </span>
      </div>

      <div className="space-y-2">
        {hypotheses.map(hypothesis => (
          <HypothesisCard
            key={hypothesis.id}
            hypothesis={hypothesis}
            graph={graph}
            onRefresh={onRefresh}
            onDelete={onDelete}
            onExport={onExport}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Add HypothesisProposals to TheoryEnginePanel**

```typescript
// Add to TheoryEnginePanel props
onRefreshHypothesis: (hypothesisId: string) => void;
onDeleteHypothesis: (hypothesisId: string) => void;
onExportHypothesis: (hypothesis: Hypothesis) => void;

// Add import
import { HypothesisProposals } from './HypothesisProposals';

// Add after Hypothesis Generation section
<div className="p-4">
  <HypothesisProposals
    hypotheses={hypotheses}
    graph={graph}
    onRefresh={onRefreshHypothesis}
    onDelete={onDeleteHypothesis}
    onExport={onExportHypothesis}
  />
</div>
```

**Step 3: Add handlers to App.tsx**

```typescript
// Add handlers
const handleRefreshHypothesis = useCallback((hypothesisId: string) => {
  // Re-generate with current node states
  // Implementation in next task
}, []);

const handleDeleteHypothesis = useCallback((hypothesisId: string) => {
  setHypotheses(prev => prev.filter(h => h.id !== hypothesisId));
}, []);

const handleExportHypothesis = useCallback((hypothesis: Hypothesis) => {
  const exportData = {
    hypothesis: hypothesis.prescription,
    predictions: hypothesis.predictions,
    story: hypothesis.story,
    actions: hypothesis.actionHooks.map(hook => ({
      action: hook.actionName,
      parameters: hook.parameters,
      instructions: hook.instructions,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hypothesis-${hypothesis.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}, []);

// Pass to TheoryEnginePanel
onRefreshHypothesis={handleRefreshHypothesis}
onDeleteHypothesis={handleDeleteHypothesis}
onExportHypothesis={handleExportHypothesis}
```

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Test full flow**

Run: `npm run dev`
Expected: Generate hypothesis → Card appears → Can expand, export, delete

**Step 6: Commit**

```bash
git add src/components/HypothesisProposals.tsx src/components/TheoryEnginePanel.tsx src/App.tsx
git commit -m "feat: add hypothesis proposals section with cards and export

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 6: Hypothesis Lifecycle Management

### Task 6.1: Mark Hypotheses Outdated on Graph Changes

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add effect to detect graph changes affecting hypotheses**

```typescript
// Add to App.tsx - after setGraph calls, check if hypotheses are affected

const markHypothesesOutdated = useCallback((changedNodeIds: string[], reason: string) => {
  setHypotheses(prev => prev.map(hypothesis => {
    // Check if any changed node is referenced in this hypothesis
    const referencedNodes = [
      ...hypothesis.intervenables,
      ...hypothesis.observables,
      ...hypothesis.desirables,
    ];

    const isAffected = changedNodeIds.some(id => referencedNodes.includes(id));

    if (isAffected && hypothesis.status === 'active') {
      return {
        ...hypothesis,
        status: 'outdated' as const,
        outdatedReason: reason,
      };
    }
    return hypothesis;
  }));
}, []);

// Modify handleClassifyNode to mark outdated
const handleClassifyNode = useCallback((
  nodeId: string,
  classification: NodeClassification,
  isDesirable?: boolean
) => {
  setGraph(prevGraph => ({
    ...prevGraph,
    nodes: prevGraph.nodes.map(node => {
      if (node.id !== nodeId) return node;
      if (classification === null && isDesirable !== undefined) {
        return { ...node, isDesirable };
      }
      if (classification === 'intervenable') {
        return { ...node, classification, isDesirable: false };
      }
      return { ...node, classification, isDesirable: isDesirable ?? node.isDesirable };
    }),
  }));

  const node = graph.nodes.find(n => n.id === nodeId);
  markHypothesesOutdated([nodeId], `Node "${node?.displayName}" classification changed`);
}, [graph.nodes, markHypothesesOutdated]);
```

**Step 2: Add similar checks to existing graph modification functions**

Wrap existing handlers like `handleAddNode`, `handleRemoveNode`, etc. to call `markHypothesesOutdated`.

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Test outdated marking**

Run: `npm run dev`
Expected: Generate hypothesis → Change a referenced node's classification → Hypothesis shows "Outdated"

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mark hypotheses outdated when referenced nodes change

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.2: Implement Hypothesis Refresh

**Files:**
- Modify: `src/App.tsx`

**Step 1: Implement handleRefreshHypothesis**

```typescript
const handleRefreshHypothesis = useCallback(async (hypothesisId: string) => {
  const hypothesis = hypotheses.find(h => h.id === hypothesisId);
  if (!hypothesis) return;

  // Get current node states for the hypothesis's referenced nodes
  const intervenables = graph.nodes.filter(n => hypothesis.intervenables.includes(n.id));
  const observables = graph.nodes.filter(n => hypothesis.observables.includes(n.id));
  const desirables = graph.nodes.filter(n => hypothesis.desirables.includes(n.id));

  try {
    const result = await generateHypothesis({
      experimentalContext: graph.experimentalContext,
      graph,
      intervenables,
      observables,
      desirables,
      actionSpace,
    });

    // Update the hypothesis
    setHypotheses(prev => prev.map(h => {
      if (h.id !== hypothesisId) return h;
      return {
        ...h,
        prescription: result.prescription,
        predictions: result.predictions,
        story: result.story,
        actionHooks: result.actionHooks.map(hook => ({
          ...hook,
          actionName: actionSpace.actions.find(a => a.id === hook.actionId)?.name || 'Unknown',
        })),
        critique: result.critique,
        status: 'active' as const,
        outdatedReason: undefined,
      };
    }));
  } catch (err) {
    console.error('Failed to refresh hypothesis:', err);
  }
}, [hypotheses, graph, actionSpace]);
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test refresh flow**

Run: `npm run dev`
Expected: Outdated hypothesis → Click Refresh → Hypothesis updates and becomes active

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add hypothesis refresh to regenerate outdated hypotheses

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 6.3: Add Hypothesis Auto-Save

**Files:**
- Modify: `src/App.tsx`

**Step 1: Extend auto-save to include hypotheses**

Find the existing auto-save useEffect and add hypotheses:

```typescript
// Modify existing auto-save effect
useEffect(() => {
  const saveData = {
    graph,
    hypotheses,
    actionSpace,
    timestamp: Date.now(),
  };
  localStorage.setItem('theory-engine-autosave', JSON.stringify(saveData));
}, [graph, hypotheses, actionSpace]);

// Modify recovery logic to include hypotheses and actionSpace
useEffect(() => {
  const saved = localStorage.getItem('theory-engine-autosave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (data.hypotheses) setHypotheses(data.hypotheses);
      if (data.actionSpace) setActionSpace(data.actionSpace);
      // ... existing graph recovery
    } catch (e) {
      console.error('Failed to recover saved data');
    }
  }
}, []);
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test persistence**

Run: `npm run dev`
Expected: Generate hypothesis → Refresh page → Hypothesis still present

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add auto-save for hypotheses and action space

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 7: Natural Language Graph Modification

### Task 7.1: Add NL Graph Modification LLM Function

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add parseGraphModification function**

```typescript
// Add to src/services/api.ts

export type GraphModificationAction =
  | { type: 'add_node'; name: string; description: string; connectTo?: string; direction?: 'upstream' | 'downstream' }
  | { type: 'remove_node'; nodeId: string }
  | { type: 'add_edge'; source: string; target: string }
  | { type: 'remove_edge'; source: string; target: string }
  | { type: 'expand_node'; nodeId: string; hint?: string }
  | { type: 'error'; message: string };

export async function parseGraphModification(
  command: string,
  graph: CausalGraph
): Promise<GraphModificationAction> {
  const client = getClient();

  const prompt = `You are a graph modification parser. Given a natural language command and the current graph state, determine the intended modification.

CURRENT GRAPH NODES:
${graph.nodes.map(n => `- ID: ${n.id}, Name: ${n.displayName}, Description: ${n.description}`).join('\n')}

CURRENT GRAPH EDGES:
${graph.edges.map(e => {
  const source = graph.nodes.find(n => n.id === e.source);
  const target = graph.nodes.find(n => n.id === e.target);
  return `- ${source?.displayName} → ${target?.displayName}`;
}).join('\n')}

USER COMMAND: "${command}"

Parse this command and respond with ONE of these JSON formats:

Add a new node:
{"type": "add_node", "name": "node_name", "description": "what it represents", "connectTo": "existing_node_id", "direction": "upstream" or "downstream"}

Remove a node:
{"type": "remove_node", "nodeId": "node_id"}

Add an edge:
{"type": "add_edge", "source": "source_node_id", "target": "target_node_id"}

Remove an edge:
{"type": "remove_edge", "source": "source_node_id", "target": "target_node_id"}

Expand a node into multiple:
{"type": "expand_node", "nodeId": "node_id", "hint": "optional expansion hint"}

If the command is unclear or invalid:
{"type": "error", "message": "explanation of what's wrong"}

Match node names flexibly (case-insensitive, partial matches OK).
Respond with ONLY the JSON, no explanation.`;

  const response = await client.chat.completions.create({
    model: getApiConfig().deploymentName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from LLM');

  if (response.usage) {
    addTokenUsage(response.usage.prompt_tokens, response.usage.completion_tokens);
  }

  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as GraphModificationAction;
}
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add NL graph modification parser LLM function

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7.2: Create NL Command Input Component

**Files:**
- Create: `src/components/NLGraphCommand.tsx`
- Modify: `src/App.tsx`

**Step 1: Create NLGraphCommand component**

```typescript
// src/components/NLGraphCommand.tsx
import React, { useState } from 'react';
import type { CausalGraph } from '../types';
import { parseGraphModification, GraphModificationAction } from '../services/api';

interface NLGraphCommandProps {
  graph: CausalGraph;
  onAction: (action: GraphModificationAction) => void;
}

export function NLGraphCommand({ graph, onAction }: NLGraphCommandProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<GraphModificationAction | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const action = await parseGraphModification(command, graph);
      setLastAction(action);

      if (action.type === 'error') {
        setError(action.message);
      } else {
        onAction(action);
        setCommand('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse command');
    } finally {
      setIsProcessing(false);
    }
  };

  const actionDescription = (action: GraphModificationAction): string => {
    switch (action.type) {
      case 'add_node': return `Add node "${action.name}"`;
      case 'remove_node': return `Remove node ${action.nodeId}`;
      case 'add_edge': return `Connect ${action.source} → ${action.target}`;
      case 'remove_edge': return `Disconnect ${action.source} → ${action.target}`;
      case 'expand_node': return `Expand node ${action.nodeId}`;
      case 'error': return action.message;
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="e.g., 'add temperature node upstream of phase'"
          className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!command.trim() || isProcessing}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {isProcessing ? '...' : 'Go'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {lastAction && lastAction.type !== 'error' && (
        <p className="text-xs text-green-600">✓ {actionDescription(lastAction)}</p>
      )}

      <p className="text-xs text-gray-400">
        Try: "add node X", "delete Y", "connect X to Y", "expand Z"
      </p>
    </div>
  );
}
```

**Step 2: Add to GraphCanvas or App.tsx toolbar area**

```typescript
// Add handler to App.tsx
const handleGraphAction = useCallback((action: GraphModificationAction) => {
  switch (action.type) {
    case 'add_node': {
      const newNode: CausalNode = {
        id: `node-${Date.now()}`,
        variableName: action.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: action.name,
        description: action.description,
      };
      let newGraph = addNode(graph, newNode);

      if (action.connectTo) {
        const edgeId = `edge-${Date.now()}`;
        if (action.direction === 'upstream') {
          newGraph = addEdge(newGraph, { id: edgeId, source: newNode.id, target: action.connectTo });
        } else {
          newGraph = addEdge(newGraph, { id: edgeId, source: action.connectTo, target: newNode.id });
        }
      }
      setGraph(newGraph);
      break;
    }
    case 'remove_node': {
      const node = graph.nodes.find(n => n.id === action.nodeId);
      if (node) {
        setGraph(removeNode(graph, action.nodeId));
        markHypothesesOutdated([action.nodeId], `Node "${node.displayName}" was removed`);
      }
      break;
    }
    // ... handle other action types
  }
}, [graph, markHypothesesOutdated]);
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Test NL commands**

Run: `npm run dev`
Expected: Type "add temperature node" → Node appears in graph

**Step 5: Commit**

```bash
git add src/components/NLGraphCommand.tsx src/App.tsx
git commit -m "feat: add natural language graph modification input

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 8: Delete Node Button

### Task 8.1: Add Delete Button to SidePanel

**Files:**
- Modify: `src/components/SidePanel.tsx`
- Modify: `src/App.tsx`

**Step 1: Add delete button to SidePanel node info section**

```typescript
// In SidePanel.tsx, add to the node info section where other action buttons are:
<button
  onClick={() => onDeleteNode(selectedNode.id)}
  className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
>
  Delete Node
</button>
```

**Step 2: Add prop and handler**

```typescript
// Add to SidePanel props
onDeleteNode: (nodeId: string) => void;

// Add handler in App.tsx
const handleDeleteNode = useCallback((nodeId: string) => {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return;

  if (window.confirm(`Delete node "${node.displayName}"? This cannot be undone.`)) {
    setGraph(removeNode(graph, nodeId));
    markHypothesesOutdated([nodeId], `Node "${node.displayName}" was deleted`);
    setSelectedNodeId(null);
  }
}, [graph, markHypothesesOutdated]);
```

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Test deletion**

Run: `npm run dev`
Expected: Select node → Click Delete → Confirm → Node removed

**Step 5: Commit**

```bash
git add src/components/SidePanel.tsx src/App.tsx
git commit -m "feat: add delete node button with confirmation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 9: Ollama Support (Optional)

### Task 9.1: Add Ollama Provider Option

**Files:**
- Modify: `src/services/api.ts`
- Modify: API config UI (if exists)

**Step 1: Add Ollama client creation**

```typescript
// Add to api.ts

type LLMProvider = 'azure' | 'ollama';

interface OllamaConfig {
  endpoint: string;  // e.g., http://localhost:11434
  model: string;     // e.g., llama2, mistral
}

let ollamaConfig: OllamaConfig | null = null;

export function setOllamaConfig(config: OllamaConfig | null) {
  ollamaConfig = config;
}

export function getActiveProvider(): LLMProvider {
  return ollamaConfig ? 'ollama' : 'azure';
}

// Add Ollama-compatible API call
async function callOllama(prompt: string, temperature: number = 0.7): Promise<string> {
  if (!ollamaConfig) throw new Error('Ollama not configured');

  const response = await fetch(`${ollamaConfig.endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaConfig.model,
      prompt,
      stream: false,
      options: { temperature },
    }),
  });

  if (!response.ok) throw new Error('Ollama request failed');

  const data = await response.json();
  return data.response;
}

// Modify existing functions to use active provider
// Example: in generateHypothesis, check getActiveProvider() and route accordingly
```

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add Ollama as alternative LLM provider

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan implements the Theory Engine in 9 phases:

1. **Layout Infrastructure** - 40/60 split pane
2. **Node Classification** - I/O/D types with custom shapes
3. **Action Space** - User-defined validation sources
4. **Hypothesis Types & Generation** - LLM-powered hypothesis creation
5. **Hypothesis Proposals Display** - Cards with full details
6. **Hypothesis Lifecycle** - Outdated marking, refresh, auto-save
7. **Natural Language Modification** - NL commands for graph editing
8. **Delete Node** - Simple delete with confirmation
9. **Ollama Support** - Alternative LLM provider

Each task is atomic (2-5 minutes), follows TDD where applicable, and includes commits.
