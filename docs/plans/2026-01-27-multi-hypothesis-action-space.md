# Multi-Hypothesis Generation & Action Space Visualization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the Theory Engine to generate multiple hypotheses, consolidate their actions into a unified action set, visualize hypotheses/actions as a separate graph, and support action export with modification workflows.

**Architecture:** Four interconnected features building on existing hypothesis generation. Feature 1 modifies the generation pipeline. Feature 2 adds a consolidation layer with LLM-powered deduplication. Feature 3 introduces a second graph visualization mode using React Flow. Feature 4 adds export and bidirectional update flows.

**Tech Stack:** React 19, TypeScript, @xyflow/react (React Flow), Azure OpenAI, Tailwind CSS 4.1

---

## Feature 1: Multi-Hypothesis Generation

### Task 1.1: Add Types for Multi-Hypothesis Generation

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add the new types**

Add after the existing `Hypothesis` interface (around line 95):

```typescript
// Configuration for batch hypothesis generation
interface HypothesisGenerationConfig {
  count: number;          // Number of hypotheses to generate (1-10)
  diversityHint?: string; // Optional hint to encourage diverse hypotheses
}

// Result of batch hypothesis generation
interface HypothesisBatch {
  id: string;
  createdAt: string;
  hypotheses: Hypothesis[];
  config: HypothesisGenerationConfig;
}
```

**Step 2: Export the new types**

Update the exports at the bottom of the file to include `HypothesisGenerationConfig` and `HypothesisBatch`.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add types for multi-hypothesis generation"
```

---

### Task 1.2: Update HypothesisGenerator UI for Count Selection

**Files:**
- Modify: `src/components/HypothesisGenerator.tsx`

**Step 1: Read the current file to understand structure**

Review `HypothesisGenerator.tsx` to identify where to add the count input.

**Step 2: Add state for hypothesis count**

Add state variable near the top of the component:

```typescript
const [hypothesisCount, setHypothesisCount] = useState<number>(1);
```

**Step 3: Add count selector UI**

Add before the hint textarea:

```typescript
<div className="mb-3">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Number of Hypotheses
  </label>
  <div className="flex items-center gap-2">
    <input
      type="range"
      min="1"
      max="10"
      value={hypothesisCount}
      onChange={(e) => setHypothesisCount(parseInt(e.target.value))}
      className="flex-1"
    />
    <span className="text-sm font-mono w-6 text-center">{hypothesisCount}</span>
  </div>
  <p className="text-xs text-gray-500 mt-1">
    More hypotheses = more diverse perspectives, but longer generation time
  </p>
</div>
```

**Step 4: Update generate button handler to pass count**

Modify the `onClick` handler for the generate button to pass `hypothesisCount` to the parent:

```typescript
onClick={() => onGenerate(hint, hypothesisCount)}
```

**Step 5: Update props interface**

Update the component's props interface:

```typescript
interface HypothesisGeneratorProps {
  // ... existing props
  onGenerate: (hint: string, count: number) => void;
}
```

**Step 6: Commit**

```bash
git add src/components/HypothesisGenerator.tsx
git commit -m "feat: add hypothesis count selector to generator UI"
```

---

### Task 1.3: Update API for Batch Hypothesis Generation

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add batch generation function**

Add after `generateHypothesis` function (around line 1850):

```typescript
export async function generateMultipleHypotheses(
  intervenables: CausalNode[],
  observables: CausalNode[],
  desirables: CausalNode[],
  actionSpace: ActionSpace,
  allNodes: CausalNode[],
  allEdges: CausalEdge[],
  experimentalContext: string,
  config: HypothesisGenerationConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<Hypothesis[]> {
  const hypotheses: Hypothesis[] = [];
  const existingPrescriptions: string[] = [];

  for (let i = 0; i < config.count; i++) {
    // Build diversity prompt based on existing hypotheses
    const diversityPrompt = existingPrescriptions.length > 0
      ? `\n\nIMPORTANT: Generate a hypothesis that is DIFFERENT from these already generated:\n${existingPrescriptions.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}\n\nFocus on a different causal pathway, mechanism, or intervention strategy.`
      : '';

    const diversityHint = config.diversityHint
      ? `\nUser guidance: ${config.diversityHint}`
      : '';

    const generated = await generateHypothesis(
      intervenables,
      observables,
      desirables,
      actionSpace,
      allNodes,
      allEdges,
      experimentalContext,
      diversityPrompt + diversityHint
    );

    const hypothesis: Hypothesis = {
      id: `hyp-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
      intervenables: intervenables.map(n => n.id),
      observables: observables.map(n => n.id),
      desirables: desirables.map(n => n.id),
      prescription: generated.prescription,
      predictions: generated.predictions,
      story: generated.story,
      actionHooks: generated.actionHooks,
      critique: generated.critique,
      status: 'active'
    };

    hypotheses.push(hypothesis);
    existingPrescriptions.push(generated.prescription);

    if (onProgress) {
      onProgress(i + 1, config.count);
    }
  }

  return hypotheses;
}
```

**Step 2: Import the new type**

Add `HypothesisGenerationConfig` to the imports from types.

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add batch hypothesis generation with diversity"
```

---

### Task 1.4: Wire Up Multi-Hypothesis Generation in App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import the new function**

Add `generateMultipleHypotheses` to imports from `./services/api`.

**Step 2: Add generation progress state**

Add near other state declarations:

```typescript
const [generationProgress, setGenerationProgress] = useState<{current: number; total: number} | null>(null);
```

**Step 3: Update handleGenerateHypothesis function**

Find `handleGenerateHypothesis` and update it to handle count parameter:

```typescript
const handleGenerateHypothesis = async (hint: string, count: number = 1) => {
  if (!selectedNode) return;

  const intervenables = graph.nodes.filter(n => n.classification === 'intervenable');
  const observables = graph.nodes.filter(n => n.classification === 'observable');
  const desirables = graph.nodes.filter(n => n.isDesirable);

  if (intervenables.length === 0 || observables.length === 0 || desirables.length === 0) {
    alert('Please classify at least one node as intervenable, one as observable, and one as desirable');
    return;
  }

  setIsGenerating(true);
  setGenerationProgress({ current: 0, total: count });

  try {
    const newHypotheses = await generateMultipleHypotheses(
      intervenables,
      observables,
      desirables,
      actionSpace,
      graph.nodes,
      graph.edges,
      graph.experimentalContext,
      { count, diversityHint: hint },
      (completed, total) => setGenerationProgress({ current: completed, total })
    );

    setHypotheses(prev => [...newHypotheses, ...prev]);
    if (newHypotheses.length > 0) {
      setActiveHypothesisId(newHypotheses[0].id);
    }
  } catch (error) {
    console.error('Failed to generate hypotheses:', error);
    alert('Failed to generate hypotheses. Please try again.');
  } finally {
    setIsGenerating(false);
    setGenerationProgress(null);
  }
};
```

**Step 4: Pass progress to TheoryEnginePanel**

Update the TheoryEnginePanel component invocation to pass `generationProgress`:

```typescript
<TheoryEnginePanel
  // ... existing props
  generationProgress={generationProgress}
/>
```

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate multi-hypothesis generation in App"
```

---

### Task 1.5: Update TheoryEnginePanel Props for Progress Display

**Files:**
- Modify: `src/components/TheoryEnginePanel.tsx`

**Step 1: Update props interface**

Add to the props interface:

```typescript
generationProgress?: { current: number; total: number } | null;
```

**Step 2: Add progress display**

In the HypothesisGenerator section, add a progress indicator when generating:

```typescript
{generationProgress && (
  <div className="mb-3 p-2 bg-blue-50 rounded-lg">
    <div className="text-sm text-blue-700 mb-1">
      Generating hypothesis {generationProgress.current} of {generationProgress.total}...
    </div>
    <div className="w-full bg-blue-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
      />
    </div>
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/components/TheoryEnginePanel.tsx
git commit -m "feat: add generation progress display to TheoryEnginePanel"
```

---

## Feature 2: Combined Action Set with Consolidation

### Task 2.1: Add Types for Combined Actions

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add combined action types**

Add after the `HypothesisBatch` interface:

```typescript
// An action linked to multiple hypotheses
interface ConsolidatedAction {
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

interface ConsolidatedActionSet {
  id: string;
  createdAt: string;
  actions: ConsolidatedAction[];
  sourceHypothesisIds: string[];
  conditioningText?: string;
}
```

**Step 2: Export the new types**

Add `ConsolidatedAction` and `ConsolidatedActionSet` to exports.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add types for consolidated action set"
```

---

### Task 2.2: Add API for Action Consolidation

**Files:**
- Modify: `src/services/api.ts`

**Step 1: Add consolidation function**

Add after `generateMultipleHypotheses`:

```typescript
export async function consolidateHypothesisActions(
  hypotheses: Hypothesis[],
  actionSpace: ActionSpace,
  conditioningText?: string
): Promise<ConsolidatedActionSet> {
  // Collect all action hooks from all hypotheses
  const actionHookMap = new Map<string, {
    action: ActionDefinition;
    hooks: { hypothesisId: string; hook: HypothesisActionHook }[];
  }>();

  for (const hyp of hypotheses) {
    for (const hook of hyp.actionHooks) {
      const existing = actionHookMap.get(hook.actionId);
      const action = actionSpace.actions.find(a => a.id === hook.actionId);
      if (!action) continue;

      if (existing) {
        existing.hooks.push({ hypothesisId: hyp.id, hook });
      } else {
        actionHookMap.set(hook.actionId, {
          action,
          hooks: [{ hypothesisId: hyp.id, hook }]
        });
      }
    }
  }

  // Build consolidated actions
  const consolidatedActions: ConsolidatedAction[] = [];

  for (const [actionId, data] of actionHookMap) {
    // Find common parameters
    const allParams = data.hooks.map(h => h.hook.parameters);
    const commonParams: Record<string, string> = {};

    if (allParams.length > 0) {
      const firstParams = allParams[0];
      for (const [key, value] of Object.entries(firstParams)) {
        const isCommon = allParams.every(p => p[key] === value);
        if (isCommon) {
          commonParams[key] = value;
        }
      }
    }

    // Generate consolidated instructions via LLM
    const instructionsList = data.hooks.map(h => h.hook.instructions);
    const consolidatedInstructions = await generateConsolidatedInstructions(
      data.action,
      instructionsList,
      conditioningText
    );

    consolidatedActions.push({
      id: `ca-${Date.now()}-${actionId}`,
      actionId,
      actionName: data.action.name,
      actionType: data.action.type,
      description: data.action.description,
      hypothesisLinks: data.hooks.map(h => ({
        hypothesisId: h.hypothesisId,
        parameters: h.hook.parameters,
        instructions: h.hook.instructions
      })),
      utilityScore: data.hooks.length,
      commonParameters: commonParams,
      consolidatedInstructions
    });
  }

  // Sort by utility score (descending)
  consolidatedActions.sort((a, b) => b.utilityScore - a.utilityScore);

  return {
    id: `cas-${Date.now()}`,
    createdAt: new Date().toISOString(),
    actions: consolidatedActions,
    sourceHypothesisIds: hypotheses.map(h => h.id),
    conditioningText
  };
}

async function generateConsolidatedInstructions(
  action: ActionDefinition,
  instructionsList: string[],
  conditioningText?: string
): Promise<string> {
  const prompt = `Given an action "${action.name}" (${action.type}) with the following description:
${action.description}

Multiple hypotheses have generated these specific instructions for executing this action:
${instructionsList.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

${conditioningText ? `User guidance: ${conditioningText}\n` : ''}
Generate a SINGLE consolidated set of instructions that would satisfy all the above requirements. Focus on:
1. Finding common elements
2. Noting any hypothesis-specific variations
3. Providing a clear, actionable execution plan

Respond with just the consolidated instructions (2-4 sentences).`;

  const response = await callLLM(prompt, 'You are a scientific methodology expert consolidating action plans.', 0.3, 500);
  return response.trim();
}
```

**Step 2: Import the new types**

Add `ConsolidatedAction`, `ConsolidatedActionSet` to imports.

**Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add API for consolidating hypothesis actions"
```

---

### Task 2.3: Add ActionConsolidationPanel Component

**Files:**
- Create: `src/components/ActionConsolidationPanel.tsx`

**Step 1: Create the component file**

```typescript
import React, { useState } from 'react';
import { ConsolidatedActionSet, ConsolidatedAction, Hypothesis, ActionSpace } from '../types';
import { consolidateHypothesisActions } from '../services/api';

interface ActionConsolidationPanelProps {
  hypotheses: Hypothesis[];
  actionSpace: ActionSpace;
  onConsolidated: (actionSet: ConsolidatedActionSet) => void;
  existingActionSet?: ConsolidatedActionSet | null;
}

export function ActionConsolidationPanel({
  hypotheses,
  actionSpace,
  onConsolidated,
  existingActionSet
}: ActionConsolidationPanelProps) {
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [conditioningText, setConditioningText] = useState('');

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');

  const handleConsolidate = async () => {
    if (activeHypotheses.length < 2) {
      alert('Need at least 2 active hypotheses to consolidate actions');
      return;
    }

    setIsConsolidating(true);
    try {
      const actionSet = await consolidateHypothesisActions(
        activeHypotheses,
        actionSpace,
        conditioningText || undefined
      );
      onConsolidated(actionSet);
    } catch (error) {
      console.error('Failed to consolidate actions:', error);
      alert('Failed to consolidate actions. Please try again.');
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-3">Action Consolidation</h3>

      <p className="text-sm text-gray-600 mb-3">
        Analyze {activeHypotheses.length} active hypotheses to find shared actions
        and create a unified action plan.
      </p>

      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conditioning Text (optional)
        </label>
        <textarea
          value={conditioningText}
          onChange={(e) => setConditioningText(e.target.value)}
          placeholder="E.g., 'Focus on high-throughput actions' or 'Prioritize computational over experimental'"
          className="w-full p-2 border border-gray-300 rounded text-sm"
          rows={2}
        />
      </div>

      <button
        onClick={handleConsolidate}
        disabled={isConsolidating || activeHypotheses.length < 2}
        className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isConsolidating ? 'Consolidating...' : 'Consolidate Actions'}
      </button>

      {existingActionSet && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">
            Consolidated Actions ({existingActionSet.actions.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {existingActionSet.actions.map(action => (
              <ConsolidatedActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsolidatedActionCard({ action }: { action: ConsolidatedAction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-2 bg-gray-50 rounded border border-gray-200">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{action.actionName}</span>
          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
            {action.utilityScore} hypotheses
          </span>
        </div>
        <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
          <p className="text-gray-600 mb-2">{action.consolidatedInstructions}</p>

          {Object.keys(action.commonParameters).length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Common Parameters:</span>
              <pre className="bg-white p-1 rounded mt-1 overflow-x-auto">
                {JSON.stringify(action.commonParameters, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-gray-500">
            Used by hypotheses: {action.hypothesisLinks.map(l => l.hypothesisId.slice(-6)).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionConsolidationPanel;
```

**Step 2: Commit**

```bash
git add src/components/ActionConsolidationPanel.tsx
git commit -m "feat: add ActionConsolidationPanel component"
```

---

### Task 2.4: Integrate Consolidation Panel in App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import the new component and types**

Add imports:

```typescript
import { ActionConsolidationPanel } from './components/ActionConsolidationPanel';
import { ConsolidatedActionSet } from './types';
```

**Step 2: Add state for consolidated action set**

Add near other state:

```typescript
const [consolidatedActionSet, setConsolidatedActionSet] = useState<ConsolidatedActionSet | null>(null);
```

**Step 3: Add consolidation panel to TheoryEnginePanel section**

Add after the HypothesisProposals component in the left panel:

```typescript
{hypotheses.length >= 2 && (
  <ActionConsolidationPanel
    hypotheses={hypotheses}
    actionSpace={actionSpace}
    onConsolidated={setConsolidatedActionSet}
    existingActionSet={consolidatedActionSet}
  />
)}
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate ActionConsolidationPanel in App"
```

---

## Feature 3: Action Space Visualization Mode

### Task 3.1: Add Types for Action Space Graph

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add visualization mode types**

Add after `ConsolidatedActionSet`:

```typescript
// Visualization modes
type VisualizationMode = 'causal' | 'action-space';

// Node types for action space graph
interface ActionSpaceNode {
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

interface ActionSpaceEdge {
  id: string;
  source: string;  // hypothesis node ID
  target: string;  // action node ID
  animated?: boolean;
}

interface ActionSpaceGraph {
  nodes: ActionSpaceNode[];
  edges: ActionSpaceEdge[];
}
```

**Step 2: Export the new types**

Add exports for `VisualizationMode`, `ActionSpaceNode`, `ActionSpaceEdge`, `ActionSpaceGraph`.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add types for action space visualization"
```

---

### Task 3.2: Create ActionSpaceCanvas Component

**Files:**
- Create: `src/components/ActionSpaceCanvas.tsx`

**Step 1: Create the component**

```typescript
import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { ActionSpaceGraph, Hypothesis, ConsolidatedAction } from '../types';
import { HypothesisNode } from './HypothesisNode';
import { ActionNode } from './ActionNode';

interface ActionSpaceCanvasProps {
  hypotheses: Hypothesis[];
  consolidatedActions: ConsolidatedAction[];
  selectedHypothesisId: string | null;
  selectedActionId: string | null;
  onHypothesisSelect: (id: string | null) => void;
  onActionSelect: (id: string | null) => void;
}

const nodeTypes: NodeTypes = {
  hypothesis: HypothesisNode,
  action: ActionNode,
};

function buildActionSpaceGraph(
  hypotheses: Hypothesis[],
  actions: ConsolidatedAction[],
  selectedHypothesisId: string | null
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 150 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add hypothesis nodes (left side)
  hypotheses.forEach((hyp, index) => {
    const nodeId = `hyp-${hyp.id}`;
    const isHighlighted = hyp.id === selectedHypothesisId;

    g.setNode(nodeId, { width: 200, height: 80 });
    nodes.push({
      id: nodeId,
      type: 'hypothesis',
      position: { x: 0, y: 0 },
      data: {
        hypothesis: hyp,
        label: `Hypothesis ${index + 1}`,
        isHighlighted,
      },
    });
  });

  // Add action nodes (right side)
  actions.forEach((action) => {
    const nodeId = `action-${action.id}`;
    const linkedHypIds = action.hypothesisLinks.map(l => l.hypothesisId);
    const isHighlighted = selectedHypothesisId
      ? linkedHypIds.includes(selectedHypothesisId)
      : false;

    g.setNode(nodeId, { width: 180, height: 60 });
    nodes.push({
      id: nodeId,
      type: 'action',
      position: { x: 0, y: 0 },
      data: {
        action,
        label: action.actionName,
        isHighlighted,
      },
    });

    // Add edges from hypotheses to this action
    action.hypothesisLinks.forEach(link => {
      const sourceId = `hyp-${link.hypothesisId}`;
      const edgeId = `${sourceId}-${nodeId}`;
      const isEdgeHighlighted = link.hypothesisId === selectedHypothesisId;

      g.setEdge(sourceId, nodeId);
      edges.push({
        id: edgeId,
        source: sourceId,
        target: nodeId,
        animated: isEdgeHighlighted,
        style: {
          stroke: isEdgeHighlighted ? '#8b5cf6' : '#94a3b8',
          strokeWidth: isEdgeHighlighted ? 2 : 1,
        },
      });
    });
  });

  dagre.layout(g);

  // Apply layout positions
  nodes.forEach(node => {
    const nodeWithPosition = g.node(node.id);
    node.position = {
      x: nodeWithPosition.x - (node.type === 'hypothesis' ? 100 : 90),
      y: nodeWithPosition.y - (node.type === 'hypothesis' ? 40 : 30),
    };
  });

  return { nodes, edges };
}

export function ActionSpaceCanvas({
  hypotheses,
  consolidatedActions,
  selectedHypothesisId,
  selectedActionId,
  onHypothesisSelect,
  onActionSelect,
}: ActionSpaceCanvasProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildActionSpaceGraph(hypotheses, consolidatedActions, selectedHypothesisId),
    [hypotheses, consolidatedActions, selectedHypothesisId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'hypothesis') {
      const hypId = node.id.replace('hyp-', '');
      onHypothesisSelect(hypId === selectedHypothesisId ? null : hypId);
      onActionSelect(null);
    } else if (node.type === 'action') {
      const actionId = node.id.replace('action-', '');
      onActionSelect(actionId === selectedActionId ? null : actionId);
    }
  }, [selectedHypothesisId, selectedActionId, onHypothesisSelect, onActionSelect]);

  return (
    <div className="w-full h-full" style={{ backgroundColor: '#1e1b4b' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#4338ca"
          gap={20}
        />
        <Controls className="bg-indigo-900 text-white" />
        <MiniMap
          nodeStrokeColor="#4338ca"
          nodeColor={(node) => node.type === 'hypothesis' ? '#a78bfa' : '#f472b6'}
          className="bg-indigo-950"
        />
      </ReactFlow>
    </div>
  );
}

export default ActionSpaceCanvas;
```

**Step 2: Commit**

```bash
git add src/components/ActionSpaceCanvas.tsx
git commit -m "feat: add ActionSpaceCanvas component"
```

---

### Task 3.3: Create HypothesisNode Component

**Files:**
- Create: `src/components/HypothesisNode.tsx`

**Step 1: Create the component**

```typescript
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Hypothesis } from '../types';

interface HypothesisNodeData {
  hypothesis: Hypothesis;
  label: string;
  isHighlighted: boolean;
}

function HypothesisNodeComponent({ data }: NodeProps) {
  const { hypothesis, label, isHighlighted } = data as HypothesisNodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        ${isHighlighted
          ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-400 ring-opacity-50'
          : 'bg-white border-gray-300'
        }
      `}
    >
      <div className="font-semibold text-sm text-gray-800 mb-1">{label}</div>
      <div className="text-xs text-gray-600 line-clamp-2">
        {hypothesis.prescription}
      </div>
      <div className="flex gap-1 mt-2">
        <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
          {hypothesis.actionHooks.length} actions
        </span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${
          hypothesis.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {hypothesis.status}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}

export const HypothesisNode = memo(HypothesisNodeComponent);
export default HypothesisNode;
```

**Step 2: Commit**

```bash
git add src/components/HypothesisNode.tsx
git commit -m "feat: add HypothesisNode component for action space graph"
```

---

### Task 3.4: Create ActionNode Component

**Files:**
- Create: `src/components/ActionNode.tsx`

**Step 1: Create the component**

```typescript
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ConsolidatedAction } from '../types';

interface ActionNodeData {
  action: ConsolidatedAction;
  label: string;
  isHighlighted: boolean;
}

const actionTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  md_simulation: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-400' },
  experiment: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' },
  literature: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400' },
  dataset: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
};

function ActionNodeComponent({ data }: NodeProps) {
  const { action, label, isHighlighted } = data as ActionNodeData;
  const colors = actionTypeColors[action.actionType] || actionTypeColors.custom;

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-md min-w-[180px]
        ${isHighlighted
          ? `${colors.bg} ${colors.border} ring-2 ring-pink-400 ring-opacity-50`
          : `${colors.bg} ${colors.border}`
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-pink-500"
      />

      <div className={`font-semibold text-sm ${colors.text}`}>{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-1.5 py-0.5 bg-white bg-opacity-60 rounded">
          {action.actionType}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded">
          {action.utilityScore} hyp
        </span>
      </div>
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
export default ActionNode;
```

**Step 2: Commit**

```bash
git add src/components/ActionNode.tsx
git commit -m "feat: add ActionNode component for action space graph"
```

---

### Task 3.5: Add Visualization Mode Toggle to App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import the new components and types**

Add imports:

```typescript
import { ActionSpaceCanvas } from './components/ActionSpaceCanvas';
import { VisualizationMode } from './types';
```

**Step 2: Add visualization mode state**

Add near other state:

```typescript
const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('causal');
const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
```

**Step 3: Add mode toggle in the header/toolbar**

Add a toggle button near the graph canvas area:

```typescript
<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex bg-white rounded-lg shadow-lg p-1">
  <button
    onClick={() => setVisualizationMode('causal')}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      visualizationMode === 'causal'
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    Causal Graph
  </button>
  <button
    onClick={() => setVisualizationMode('action-space')}
    disabled={!consolidatedActionSet}
    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      visualizationMode === 'action-space'
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed'
    }`}
  >
    Action Space
  </button>
</div>
```

**Step 4: Conditionally render graph canvases**

Replace or wrap the GraphCanvas component:

```typescript
{visualizationMode === 'causal' ? (
  <GraphCanvas
    // ... existing props
  />
) : (
  <ActionSpaceCanvas
    hypotheses={hypotheses.filter(h => h.status === 'active')}
    consolidatedActions={consolidatedActionSet?.actions || []}
    selectedHypothesisId={activeHypothesisId}
    selectedActionId={selectedActionId}
    onHypothesisSelect={setActiveHypothesisId}
    onActionSelect={setSelectedActionId}
  />
)}
```

**Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add visualization mode toggle between causal and action space"
```

---

## Feature 4: Action Export and Modification

### Task 4.1: Add Types for Action Modifications

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add modification types**

Add after `ActionSpaceGraph`:

```typescript
// Proposed modification to an action
interface ActionModification {
  id: string;
  originalActionId: string;
  proposedChanges: {
    instructions?: string;
    parameters?: Record<string, string>;
  };
  affectedHypothesisIds: string[];
  status: 'pending' | 'approved' | 'rejected';
  rationale: string;
}

// Exported action with full context
interface ExportedAction {
  action: ConsolidatedAction;
  exportedAt: string;
  linkedHypotheses: {
    id: string;
    prescription: string;
    status: string;
  }[];
  format: 'json' | 'markdown';
}
```

**Step 2: Export the new types**

Add `ActionModification` and `ExportedAction` to exports.

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add types for action modifications and export"
```

---

### Task 4.2: Create ActionDetailPanel Component

**Files:**
- Create: `src/components/ActionDetailPanel.tsx`

**Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import { ConsolidatedAction, Hypothesis, ActionModification } from '../types';

interface ActionDetailPanelProps {
  action: ConsolidatedAction;
  hypotheses: Hypothesis[];
  onExport: (action: ConsolidatedAction, format: 'json' | 'markdown') => void;
  onProposeModification: (modification: ActionModification) => void;
  onClose: () => void;
}

export function ActionDetailPanel({
  action,
  hypotheses,
  onExport,
  onProposeModification,
  onClose
}: ActionDetailPanelProps) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedInstructions, setModifiedInstructions] = useState(action.consolidatedInstructions);
  const [modificationRationale, setModificationRationale] = useState('');

  const linkedHypotheses = hypotheses.filter(h =>
    action.hypothesisLinks.some(l => l.hypothesisId === h.id)
  );

  const handleExportJSON = () => {
    onExport(action, 'json');
  };

  const handleExportMarkdown = () => {
    onExport(action, 'markdown');
  };

  const handleProposeModification = () => {
    if (!modificationRationale.trim()) {
      alert('Please provide a rationale for the modification');
      return;
    }

    const modification: ActionModification = {
      id: `mod-${Date.now()}`,
      originalActionId: action.id,
      proposedChanges: {
        instructions: modifiedInstructions !== action.consolidatedInstructions
          ? modifiedInstructions
          : undefined,
      },
      affectedHypothesisIds: action.hypothesisLinks.map(l => l.hypothesisId),
      status: 'pending',
      rationale: modificationRationale,
    };

    onProposeModification(modification);
    setIsModifying(false);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
        <h2 className="text-lg font-semibold">Action Details</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Action Info */}
        <div>
          <h3 className="font-semibold text-gray-800">{action.actionName}</h3>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded">{action.actionType}</span>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Description</label>
          <p className="text-sm text-gray-800 mt-1">{action.description}</p>
        </div>

        {/* Utility Score */}
        <div className="p-3 bg-purple-50 rounded-lg">
          <span className="text-sm font-medium text-purple-800">
            Utility Score: {action.utilityScore}
          </span>
          <p className="text-xs text-purple-600 mt-1">
            This action serves {action.utilityScore} hypothesis(es)
          </p>
        </div>

        {/* Instructions */}
        <div>
          <label className="text-sm font-medium text-gray-600">Consolidated Instructions</label>
          {isModifying ? (
            <textarea
              value={modifiedInstructions}
              onChange={(e) => setModifiedInstructions(e.target.value)}
              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
              rows={4}
            />
          ) : (
            <p className="text-sm text-gray-800 mt-1 p-2 bg-gray-50 rounded">
              {action.consolidatedInstructions}
            </p>
          )}
        </div>

        {/* Common Parameters */}
        {Object.keys(action.commonParameters).length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">Common Parameters</label>
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
              {JSON.stringify(action.commonParameters, null, 2)}
            </pre>
          </div>
        )}

        {/* Linked Hypotheses */}
        <div>
          <label className="text-sm font-medium text-gray-600">
            Linked Hypotheses ({linkedHypotheses.length})
          </label>
          <div className="mt-1 space-y-2">
            {linkedHypotheses.map((hyp, idx) => (
              <div key={hyp.id} className="p-2 bg-blue-50 rounded text-xs">
                <span className="font-medium">Hypothesis {idx + 1}</span>
                <p className="text-gray-600 mt-1 line-clamp-2">{hyp.prescription}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Modification UI */}
        {isModifying && (
          <div>
            <label className="text-sm font-medium text-gray-600">
              Modification Rationale
            </label>
            <textarea
              value={modificationRationale}
              onChange={(e) => setModificationRationale(e.target.value)}
              placeholder="Explain why this modification is needed..."
              className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
              rows={2}
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleProposeModification}
                className="flex-1 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
              >
                Propose Change
              </button>
              <button
                onClick={() => {
                  setIsModifying(false);
                  setModifiedInstructions(action.consolidatedInstructions);
                  setModificationRationale('');
                }}
                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              className="flex-1 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Export MD
            </button>
          </div>
          {!isModifying && (
            <button
              onClick={() => setIsModifying(true)}
              className="w-full py-2 bg-amber-100 text-amber-800 rounded text-sm hover:bg-amber-200"
            >
              Propose Modification
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ActionDetailPanel;
```

**Step 2: Commit**

```bash
git add src/components/ActionDetailPanel.tsx
git commit -m "feat: add ActionDetailPanel with export and modification UI"
```

---

### Task 4.3: Create ModificationConfirmModal Component

**Files:**
- Create: `src/components/ModificationConfirmModal.tsx`

**Step 1: Create the component**

```typescript
import React, { useState } from 'react';
import { ActionModification, Hypothesis, ConsolidatedAction } from '../types';

interface ModificationConfirmModalProps {
  modification: ActionModification;
  action: ConsolidatedAction;
  affectedHypotheses: Hypothesis[];
  onConfirm: (updatedHypotheses: { id: string; newPrescription: string }[]) => void;
  onReject: () => void;
  onCancel: () => void;
}

export function ModificationConfirmModal({
  modification,
  action,
  affectedHypotheses,
  onConfirm,
  onReject,
  onCancel
}: ModificationConfirmModalProps) {
  const [hypothesisUpdates, setHypothesisUpdates] = useState<Record<string, string>>(
    Object.fromEntries(affectedHypotheses.map(h => [h.id, h.prescription]))
  );

  const handlePrescriptionChange = (hypId: string, newText: string) => {
    setHypothesisUpdates(prev => ({ ...prev, [hypId]: newText }));
  };

  const handleConfirm = () => {
    const updates = Object.entries(hypothesisUpdates).map(([id, newPrescription]) => ({
      id,
      newPrescription
    }));
    onConfirm(updates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Confirm Action Modification</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Modification Summary */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <h3 className="font-medium text-amber-800">Proposed Changes to: {action.actionName}</h3>
            <p className="text-sm text-amber-700 mt-1">{modification.rationale}</p>

            {modification.proposedChanges.instructions && (
              <div className="mt-2">
                <span className="text-xs font-medium text-amber-800">New Instructions:</span>
                <p className="text-sm text-gray-700 mt-1 p-2 bg-white rounded">
                  {modification.proposedChanges.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Affected Hypotheses */}
          <div>
            <h3 className="font-medium text-gray-800 mb-2">
              Update Affected Hypotheses ({affectedHypotheses.length})
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Review and update each hypothesis prescription to reflect the action modification.
              The original text is shown; edit as needed.
            </p>

            <div className="space-y-3">
              {affectedHypotheses.map((hyp, idx) => (
                <div key={hyp.id} className="border border-gray-200 rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">Hypothesis {idx + 1}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      hyp.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hyp.status}
                    </span>
                  </div>
                  <label className="text-xs text-gray-500">
                    Original prescription:
                  </label>
                  <p className="text-xs text-gray-400 italic mb-2">{hyp.prescription}</p>
                  <label className="text-xs text-gray-600 font-medium">
                    Updated prescription:
                  </label>
                  <textarea
                    value={hypothesisUpdates[hyp.id]}
                    onChange={(e) => handlePrescriptionChange(hyp.id, e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded text-sm"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Reject Modification
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Confirm & Update Hypotheses
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModificationConfirmModal;
```

**Step 2: Commit**

```bash
git add src/components/ModificationConfirmModal.tsx
git commit -m "feat: add ModificationConfirmModal for hypothesis update confirmation"
```

---

### Task 4.4: Add Export Utility Functions

**Files:**
- Create: `src/utils/actionExport.ts`

**Step 1: Create the export utilities**

```typescript
import { ConsolidatedAction, Hypothesis, ExportedAction } from '../types';

export function exportActionAsJSON(
  action: ConsolidatedAction,
  hypotheses: Hypothesis[]
): string {
  const linkedHypotheses = hypotheses
    .filter(h => action.hypothesisLinks.some(l => l.hypothesisId === h.id))
    .map(h => ({
      id: h.id,
      prescription: h.prescription,
      status: h.status
    }));

  const exported: ExportedAction = {
    action,
    exportedAt: new Date().toISOString(),
    linkedHypotheses,
    format: 'json'
  };

  return JSON.stringify(exported, null, 2);
}

export function exportActionAsMarkdown(
  action: ConsolidatedAction,
  hypotheses: Hypothesis[]
): string {
  const linkedHypotheses = hypotheses.filter(
    h => action.hypothesisLinks.some(l => l.hypothesisId === h.id)
  );

  const md = `# Action: ${action.actionName}

**Type:** ${action.actionType}
**Utility Score:** ${action.utilityScore} (serves ${action.utilityScore} hypothesis(es))
**Exported:** ${new Date().toISOString()}

## Description

${action.description}

## Consolidated Instructions

${action.consolidatedInstructions}

## Common Parameters

\`\`\`json
${JSON.stringify(action.commonParameters, null, 2)}
\`\`\`

## Linked Hypotheses

${linkedHypotheses.map((h, idx) => `### Hypothesis ${idx + 1} (${h.status})

${h.prescription}

**Specific Instructions:** ${action.hypothesisLinks.find(l => l.hypothesisId === h.id)?.instructions || 'N/A'}

**Specific Parameters:**
\`\`\`json
${JSON.stringify(action.hypothesisLinks.find(l => l.hypothesisId === h.id)?.parameters || {}, null, 2)}
\`\`\`
`).join('\n')}
`;

  return md;
}

export function downloadExport(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

**Step 2: Commit**

```bash
git add src/utils/actionExport.ts
git commit -m "feat: add action export utilities for JSON and Markdown"
```

---

### Task 4.5: Integrate Action Detail Panel and Modification Flow in App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import new components and utilities**

Add imports:

```typescript
import { ActionDetailPanel } from './components/ActionDetailPanel';
import { ModificationConfirmModal } from './components/ModificationConfirmModal';
import { ActionModification } from './types';
import { exportActionAsJSON, exportActionAsMarkdown, downloadExport } from './utils/actionExport';
```

**Step 2: Add state for action detail panel and modifications**

Add near other state:

```typescript
const [pendingModification, setPendingModification] = useState<ActionModification | null>(null);
```

**Step 3: Add export handler**

Add function:

```typescript
const handleExportAction = (action: ConsolidatedAction, format: 'json' | 'markdown') => {
  const filename = `action-${action.actionName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

  if (format === 'json') {
    const content = exportActionAsJSON(action, hypotheses);
    downloadExport(content, `${filename}.json`, 'application/json');
  } else {
    const content = exportActionAsMarkdown(action, hypotheses);
    downloadExport(content, `${filename}.md`, 'text/markdown');
  }
};
```

**Step 4: Add modification handlers**

Add functions:

```typescript
const handleProposeModification = (modification: ActionModification) => {
  setPendingModification(modification);
};

const handleConfirmModification = (updatedHypotheses: { id: string; newPrescription: string }[]) => {
  // Update hypotheses with new prescriptions
  setHypotheses(prev => prev.map(h => {
    const update = updatedHypotheses.find(u => u.id === h.id);
    if (update) {
      return { ...h, prescription: update.newPrescription };
    }
    return h;
  }));

  // Update the consolidated action if it exists
  if (consolidatedActionSet && pendingModification) {
    setConsolidatedActionSet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        actions: prev.actions.map(a => {
          if (a.id === pendingModification.originalActionId && pendingModification.proposedChanges.instructions) {
            return { ...a, consolidatedInstructions: pendingModification.proposedChanges.instructions };
          }
          return a;
        })
      };
    });
  }

  setPendingModification(null);
  setSelectedActionId(null);
};

const handleRejectModification = () => {
  setPendingModification(null);
};
```

**Step 5: Render ActionDetailPanel when action selected**

Add in JSX:

```typescript
{selectedActionId && consolidatedActionSet && (
  <ActionDetailPanel
    action={consolidatedActionSet.actions.find(a => a.id === selectedActionId)!}
    hypotheses={hypotheses}
    onExport={handleExportAction}
    onProposeModification={handleProposeModification}
    onClose={() => setSelectedActionId(null)}
  />
)}
```

**Step 6: Render ModificationConfirmModal when pending**

Add in JSX:

```typescript
{pendingModification && consolidatedActionSet && (
  <ModificationConfirmModal
    modification={pendingModification}
    action={consolidatedActionSet.actions.find(a => a.id === pendingModification.originalActionId)!}
    affectedHypotheses={hypotheses.filter(h =>
      pendingModification.affectedHypothesisIds.includes(h.id)
    )}
    onConfirm={handleConfirmModification}
    onReject={handleRejectModification}
    onCancel={() => setPendingModification(null)}
  />
)}
```

**Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate action detail panel and modification flow"
```

---

## Final Integration Tasks

### Task 5.1: Update Type Exports

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Verify all new types are exported**

Ensure the export block includes all new types:

```typescript
export type {
  CausalNode,
  CausalEdge,
  CausalGraph,
  Proposal,
  ActionDefinition,
  ActionSpace,
  HypothesisActionHook,
  Hypothesis,
  // New types
  HypothesisGenerationConfig,
  HypothesisBatch,
  ConsolidatedAction,
  ConsolidatedActionSet,
  VisualizationMode,
  ActionSpaceNode,
  ActionSpaceEdge,
  ActionSpaceGraph,
  ActionModification,
  ExportedAction,
  // ... existing types
};
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: ensure all new types are exported"
```

---

### Task 5.2: Manual Testing Checklist

**Test Feature 1: Multi-Hypothesis Generation**
- [ ] Slider allows selecting 1-10 hypotheses
- [ ] Progress bar shows during batch generation
- [ ] Multiple hypotheses appear in the list
- [ ] Each hypothesis has different prescriptions (diversity working)

**Test Feature 2: Action Consolidation**
- [ ] Consolidate button appears with 2+ hypotheses
- [ ] Conditioning text input works
- [ ] Consolidated actions appear sorted by utility
- [ ] Actions link back to correct hypotheses

**Test Feature 3: Action Space Visualization**
- [ ] Toggle between causal and action-space modes
- [ ] Action-space has dark indigo background
- [ ] Hypothesis nodes on left, action nodes on right
- [ ] Clicking hypothesis highlights connected actions
- [ ] Edges animate when connected to selected hypothesis

**Test Feature 4: Action Export & Modification**
- [ ] Click action in action-space opens detail panel
- [ ] Export JSON downloads valid JSON file
- [ ] Export Markdown downloads readable MD file
- [ ] Propose modification opens confirmation modal
- [ ] Confirming modification updates hypothesis prescriptions
- [ ] Modified action instructions are saved

**Step 3: Commit final integration**

```bash
git add -A
git commit -m "feat: complete multi-hypothesis and action space features"
```

---

## Summary of Files Changed/Created

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add all new type definitions |
| `src/services/api.ts` | Modify | Add batch generation and consolidation APIs |
| `src/components/HypothesisGenerator.tsx` | Modify | Add count selector |
| `src/components/TheoryEnginePanel.tsx` | Modify | Add progress display |
| `src/components/ActionConsolidationPanel.tsx` | Create | Consolidation UI |
| `src/components/ActionSpaceCanvas.tsx` | Create | Action space graph visualization |
| `src/components/HypothesisNode.tsx` | Create | Hypothesis node for action graph |
| `src/components/ActionNode.tsx` | Create | Action node for action graph |
| `src/components/ActionDetailPanel.tsx` | Create | Action detail/export/modify panel |
| `src/components/ModificationConfirmModal.tsx` | Create | Hypothesis update confirmation |
| `src/utils/actionExport.ts` | Create | Export utilities |
| `src/App.tsx` | Modify | Wire everything together |

---

## Architecture Notes for Implementation

1. **State Management:** All new state lives in App.tsx to maintain single source of truth
2. **React Flow:** Both graphs use the same library, but different node types and styles
3. **LLM Calls:** Batch generation calls existing `generateHypothesis` sequentially with diversity prompts
4. **Consolidation:** Runs one LLM call per action to generate consolidated instructions
5. **Background Color:** Action space uses `#1e1b4b` (indigo-950) to clearly differentiate from causal graph
