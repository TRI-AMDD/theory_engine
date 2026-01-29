import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import type { Node, Edge, NodeTypes } from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { Hypothesis, ConsolidatedAction } from '../types';
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
    if (nodeWithPosition) {
      node.position = {
        x: nodeWithPosition.x - (node.type === 'hypothesis' ? 100 : 90),
        y: nodeWithPosition.y - (node.type === 'hypothesis' ? 40 : 30),
      };
    }
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

  // Update nodes/edges when data changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildActionSpaceGraph(
      hypotheses, consolidatedActions, selectedHypothesisId
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [hypotheses, consolidatedActions, selectedHypothesisId, setNodes, setEdges]);

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
    <div className="w-full h-full min-h-[400px]" style={{ backgroundColor: '#1e1b4b' }}>
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
        <Controls className="bg-indigo-900 text-white [&>button]:bg-indigo-800 [&>button]:border-indigo-700 [&>button]:text-white [&>button:hover]:bg-indigo-700" />
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
