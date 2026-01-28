import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import type { Node, Edge, NodeMouseHandler, NodeChange } from '@xyflow/react';
import Dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

import ClassifiedNode from './ClassifiedNode';
import type { CausalGraph, CausalNode } from '../types';
import type { NodeWithDegree } from '../utils/graph';

const nodeTypes = { classified: ClassifiedNode };

interface GraphCanvasProps {
  graph: CausalGraph;
  selectedNodeId: string | null;
  selectedNodeIds?: Set<string>;  // For multi-select in consolidation mode
  consolidationMode?: boolean;
  expandMode?: boolean;
  onNodeSelect: (nodeId: string) => void;
  onNodePositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  immediateDownstream?: CausalNode[];
  higherDownstream?: NodeWithDegree[];
  hypothesisHighlightedNodeIds?: Set<string>;
}

// Helper function to find upstream nodes at a given degree
function getUpstreamNodes(
  nodeId: string,
  edges: { source: string; target: string }[],
  degree: number
): Set<string> {
  const result = new Set<string>();
  let currentLevel = new Set<string>([nodeId]);

  for (let i = 0; i < degree; i++) {
    const nextLevel = new Set<string>();
    for (const edge of edges) {
      if (currentLevel.has(edge.target)) {
        nextLevel.add(edge.source);
      }
    }
    for (const node of nextLevel) {
      result.add(node);
    }
    currentLevel = nextLevel;
  }

  return result;
}

// Get node background color based on selection state
function getNodeStyle(
  nodeId: string,
  selectedNodeId: string | null,
  immediateUpstream: Set<string>,
  secondDegreeUpstream: Set<string>,
  immediateDownstream: Set<string>,
  higherDownstream: Set<string>,
  consolidationMode?: boolean,
  selectedNodeIds?: Set<string>,
  expandMode?: boolean
): React.CSSProperties {
  // In consolidation mode, show purple for multi-selected nodes
  if (consolidationMode && selectedNodeIds?.has(nodeId)) {
    return {
      backgroundColor: '#9333ea',
      border: '3px solid #7c3aed',
      borderRadius: '8px',
      padding: '10px 15px',
      color: 'white',
      boxShadow: '0 0 0 3px rgba(147, 51, 234, 0.3)',
    };
  }

  // In expand mode, show yellow for selected node
  if (expandMode && nodeId === selectedNodeId) {
    return {
      backgroundColor: '#eab308',
      border: '3px solid #ca8a04',
      borderRadius: '8px',
      padding: '10px 15px',
      color: 'white',
      boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.3)',
    };
  }

  if (nodeId === selectedNodeId && !consolidationMode && !expandMode) {
    // Selected node: yellow/amber background (only in normal mode)
    return {
      backgroundColor: '#fbbf24',
      border: '2px solid #d97706',
      borderRadius: '8px',
      padding: '10px 15px',
    };
  }

  if (immediateUpstream.has(nodeId)) {
    // Immediate upstream (1st degree): blue background
    return {
      backgroundColor: '#3b82f6',
      border: '2px solid #1d4ed8',
      borderRadius: '8px',
      padding: '10px 15px',
      color: 'white',
    };
  }

  if (secondDegreeUpstream.has(nodeId)) {
    // 2nd degree and beyond: light gray/blue background
    return {
      backgroundColor: '#dbeafe',
      border: '2px solid #93c5fd',
      borderRadius: '8px',
      padding: '10px 15px',
    };
  }

  if (immediateDownstream.has(nodeId)) {
    // Immediate downstream (1st degree): deep red background
    return {
      backgroundColor: '#991B1B',
      border: '2px solid #7F1D1D',
      borderRadius: '8px',
      padding: '10px 15px',
      color: 'white',
    };
  }

  if (higherDownstream.has(nodeId)) {
    // 2nd degree and beyond downstream: bright pink background
    return {
      backgroundColor: '#F472B6',
      border: '2px solid #EC4899',
      borderRadius: '8px',
      padding: '10px 15px',
      color: 'white',
    };
  }

  // Other nodes: white/default
  return {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 15px',
  };
}

// Get relationship color for ClassifiedNode
function getRelationshipColor(
  nodeId: string,
  selectedNodeId: string | null,
  immediateUpstream: Set<string>,
  secondDegreeUpstream: Set<string>,
  immediateDownstream: Set<string>,
  higherDownstream: Set<string>,
  consolidationMode?: boolean,
  selectedNodeIds?: Set<string>,
  expandMode?: boolean
): string | undefined {
  if (consolidationMode && selectedNodeIds?.has(nodeId)) {
    return '#9333ea'; // Purple for multi-selected
  }
  if (expandMode && nodeId === selectedNodeId) {
    return '#eab308'; // Yellow for expand mode selected
  }
  if (nodeId === selectedNodeId && !consolidationMode && !expandMode) {
    return '#fbbf24'; // Yellow/amber for selected
  }
  if (immediateUpstream.has(nodeId)) {
    return '#3b82f6'; // Blue for immediate upstream
  }
  if (secondDegreeUpstream.has(nodeId)) {
    return '#dbeafe'; // Light blue for second degree upstream
  }
  if (immediateDownstream.has(nodeId)) {
    return '#991B1B'; // Deep red for immediate downstream
  }
  if (higherDownstream.has(nodeId)) {
    return '#F472B6'; // Pink for higher downstream
  }
  return undefined; // Default - let ClassifiedNode handle it
}

// Calculate dynamic node width based on label length
function getNodeWidth(label: string): number {
  const charWidth = 8; // approximate pixels per character
  const padding = 32; // px-4 = 16px each side
  const minWidth = 80;
  const maxWidth = 220;
  return Math.min(maxWidth, Math.max(minWidth, label.length * charWidth + padding));
}

// Auto-layout using dagre
function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'TB') {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    const label = (node.data as { label?: string })?.label || '';
    const width = getNodeWidth(label);
    g.setNode(node.id, { width, height: 50 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const position = g.node(node.id);
    const label = (node.data as { label?: string })?.label || '';
    const width = getNodeWidth(label);
    return {
      ...node,
      position: { x: position.x - width / 2, y: position.y - 25 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function GraphCanvasInner({ graph, selectedNodeId, selectedNodeIds, consolidationMode, expandMode, onNodeSelect, onNodePositionsChange, immediateDownstream: immediateDownstreamProp, higherDownstream: higherDownstreamProp, hypothesisHighlightedNodeIds }: GraphCanvasProps) {
  const [hasInitialLayout, setHasInitialLayout] = useState(false);

  // Track graph identity to detect preset changes
  const graphSignature = useMemo(() => {
    return graph.nodes.map(n => n.id).sort().join(',');
  }, [graph.nodes]);

  // Calculate upstream nodes for coloring
  const { immediateUpstream, secondDegreeUpstream } = useMemo(() => {
    if (!selectedNodeId) {
      return { immediateUpstream: new Set<string>(), secondDegreeUpstream: new Set<string>() };
    }

    const immediate = getUpstreamNodes(selectedNodeId, graph.edges, 1);
    const allSecondDegree = getUpstreamNodes(selectedNodeId, graph.edges, 2);

    // Second degree excludes immediate upstream nodes
    const secondDegreeOnly = new Set<string>();
    for (const node of allSecondDegree) {
      if (!immediate.has(node)) {
        secondDegreeOnly.add(node);
      }
    }

    return { immediateUpstream: immediate, secondDegreeUpstream: secondDegreeOnly };
  }, [selectedNodeId, graph.edges]);

  // Convert downstream props to Sets for efficient lookup
  const { immediateDownstream, higherDownstream } = useMemo(() => {
    const immediateSet = new Set<string>(
      (immediateDownstreamProp ?? []).map((node) => node.id)
    );
    const higherSet = new Set<string>(
      (higherDownstreamProp ?? []).map((item) => item.node.id)
    );
    return { immediateDownstream: immediateSet, higherDownstream: higherSet };
  }, [immediateDownstreamProp, higherDownstreamProp]);

  // Convert CausalGraph nodes to react-flow format
  const initialNodes: Node[] = useMemo(() => {
    return graph.nodes.map((node) => ({
      id: node.id,
      type: 'classified',
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.displayName,
        classification: node.classification,
        isDesirable: node.isDesirable,
        isSelected: consolidationMode ? selectedNodeIds?.has(node.id) : node.id === selectedNodeId,
        relationshipColor: getRelationshipColor(node.id, selectedNodeId, immediateUpstream, secondDegreeUpstream, immediateDownstream, higherDownstream, consolidationMode, selectedNodeIds, expandMode),
        isHypothesisHighlighted: hypothesisHighlightedNodeIds?.has(node.id) ?? false,
      },
      style: getNodeStyle(node.id, selectedNodeId, immediateUpstream, secondDegreeUpstream, immediateDownstream, higherDownstream, consolidationMode, selectedNodeIds, expandMode),
      selected: consolidationMode ? selectedNodeIds?.has(node.id) : node.id === selectedNodeId,
    }));
  }, [graph.nodes, selectedNodeId, immediateUpstream, secondDegreeUpstream, immediateDownstream, higherDownstream, consolidationMode, selectedNodeIds, expandMode, hypothesisHighlightedNodeIds]);

  // Convert CausalGraph edges to react-flow format with arrows
  const initialEdges: Edge[] = useMemo(() => {
    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: '#64748b',
      },
      style: {
        stroke: '#64748b',
        strokeWidth: 2,
      },
    }));
  }, [graph.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Track the previous graph signature to detect real graph changes vs just selection changes
  const [prevGraphSignature, setPrevGraphSignature] = useState<string | null>(null);
  const graphStructureChanged = prevGraphSignature !== graphSignature;
  const isInitialMount = prevGraphSignature === null;

  // Update nodes when selection changes - only update styles, not positions
  useEffect(() => {
    if (!graphStructureChanged && !isInitialMount) {
      // Selection change only - update styles without touching positions
      setNodes(currentNodes =>
        currentNodes.map(node => {
          const initialNode = initialNodes.find(n => n.id === node.id);
          if (initialNode) {
            return {
              ...node,
              style: initialNode.style,
              selected: initialNode.selected
            };
          }
          return node;
        })
      );
    } else {
      // Graph structure changed or initial mount - full update
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes, graphStructureChanged, isInitialMount]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Reset layout flag when graph structure changes (e.g., preset load, node added)
  useEffect(() => {
    if (graphStructureChanged || isInitialMount) {
      setHasInitialLayout(false);
    }
  }, [graphStructureChanged, isInitialMount]);

  // Auto-layout on initial mount or after graph structure changes
  useEffect(() => {
    if (!hasInitialLayout && nodes.length > 0) {
      const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges, 'TB');
      setNodes(layoutedNodes);
      setHasInitialLayout(true);
      setPrevGraphSignature(graphSignature);
    }
  }, [nodes.length, edges, hasInitialLayout, setNodes, graphSignature]);

  // Handle node position changes (drag and drop)
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Notify parent of position changes after drag ends
    const positionChanges = changes.filter(
      (change) => change.type === 'position' && change.dragging === false
    );

    if (positionChanges.length > 0 && onNodePositionsChange) {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach((node) => {
        positions[node.id] = node.position;
      });
      onNodePositionsChange(positions);
    }
  }, [onNodesChange, nodes, onNodePositionsChange]);

  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  // Auto-layout handler
  const onAutoLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB' // Top to bottom - causes flow down to effects
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);

    // Notify parent of new positions
    if (onNodePositionsChange) {
      const positions: Record<string, { x: number; y: number }> = {};
      layoutedNodes.forEach((node) => {
        positions[node.id] = node.position;
      });
      onNodePositionsChange(positions);
    }
  }, [nodes, edges, setNodes, setEdges, onNodePositionsChange]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.05}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <Panel position="top-left" className="flex gap-2">
          <button
            onClick={onAutoLayout}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            Auto Layout
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default GraphCanvas;
