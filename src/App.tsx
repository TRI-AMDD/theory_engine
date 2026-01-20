import { useState, useCallback, useMemo, useEffect } from 'react';
import type { CausalGraph, CausalNode, Proposal, ExistingNodeProposal, ProposalConfig } from './types';
import { initialGraph, experimentPresets } from './data/initialData';
import {
  getNode,
  getImmediateUpstream,
  getUpstreamWithDegrees,
  getImmediateDownstream,
  getDownstreamWithDegrees,
  getUnconnectedUpstream,
  getUnconnectedDownstream,
  addNode,
  addEdge,
  addEdgeSafe,
  removeEdge
} from './utils/graph';
import {
  generateAndAssessProposals,
  evaluateExistingNodes,
  proposeCondensedNode,
  proposeNodeExpansion,
  type GraphContext,
  type TokenUsage,
  type CondensedNodeProposal,
  type ExpansionProposal,
  subscribeToTokenUpdates,
  getSessionTokenUsage,
  resetSessionTokenUsage
} from './services/api';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { ProposalList } from './components/ProposalList';
import { ContextHeader } from './components/ContextHeader';
import { BuildFromDataWizard } from './components/BuildFromDataWizard';
import { HelpModal } from './components/HelpModal';
import { WhyzenExportWizard } from './components/WhyzenExportWizard';
import { AddNodeModal } from './components/AddNodeModal';

function App() {
  // Core state
  const [graph, setGraph] = useState<CausalGraph>(initialGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [existingNodeProposals, setExistingNodeProposals] = useState<ExistingNodeProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDirection, setGeneratingDirection] = useState<'upstream' | 'downstream' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Token usage tracking
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>(getSessionTokenUsage());

  // Build from Data wizard state
  const [showBuildWizard, setShowBuildWizard] = useState(false);

  // Help modal state
  const [showHelp, setShowHelp] = useState(false);

  // Whyzen Export wizard state
  const [showWhyzenExport, setShowWhyzenExport] = useState(false);

  // Add Node modal state
  const [showAddNode, setShowAddNode] = useState(false);

  // Auto-save recovery state
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{ graph: CausalGraph; timestamp: number } | null>(null);

  // New Graph confirmation state
  const [confirmNewGraph, setConfirmNewGraph] = useState(false);

  // Consolidation mode state
  const [consolidationMode, setConsolidationMode] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [condensedProposal, setCondensedProposal] = useState<CondensedNodeProposal | null>(null);
  const [isCondensing, setIsCondensing] = useState(false);

  // Expand mode state
  const [expandMode, setExpandMode] = useState(false);
  const [expandLevel, setExpandLevel] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [expandHint, setExpandHint] = useState('');
  const [consolidateHint, setConsolidateHint] = useState('');
  const [expansionProposal, setExpansionProposal] = useState<ExpansionProposal | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToTokenUpdates(setTokenUsage);
    return unsubscribe;
  }, []);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (graph.nodes.length > 0) {
        localStorage.setItem('causeway-autosave', JSON.stringify({
          graph,
          timestamp: Date.now()
        }));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [graph]);

  // Check for recovery data on mount
  useEffect(() => {
    const saved = localStorage.getItem('causeway-autosave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const age = Date.now() - data.timestamp;
        // Only offer recovery if less than 24 hours old and has nodes
        if (age < 24 * 60 * 60 * 1000 && data.graph?.nodes?.length > 0) {
          setRecoveryData(data);
          setShowRecoveryPrompt(true);
        }
      } catch {
        // Invalid data, ignore
        localStorage.removeItem('causeway-autosave');
      }
    }
  }, []);

  // Handle recovery
  const handleRecoverGraph = useCallback(() => {
    if (recoveryData) {
      setGraph(recoveryData.graph);
      setSelectedNodeId(null);
      setProposals([]);
      setExistingNodeProposals([]);
    }
    setShowRecoveryPrompt(false);
    setRecoveryData(null);
  }, [recoveryData]);

  const handleDismissRecovery = useCallback(() => {
    setShowRecoveryPrompt(false);
    setRecoveryData(null);
    localStorage.removeItem('causeway-autosave');
  }, []);

  // Derived state: selected node and its upstream relationships
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return getNode(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  const immediateUpstream = useMemo(() => {
    if (!selectedNodeId) return [];
    return getImmediateUpstream(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  const higherUpstream = useMemo(() => {
    if (!selectedNodeId) return [];
    // Get all upstream with degrees, filter out immediate (degree 1)
    const allWithDegrees = getUpstreamWithDegrees(graph, selectedNodeId);
    return allWithDegrees.filter(item => item.degree > 1);
  }, [graph, selectedNodeId]);

  const immediateDownstream = useMemo(() => {
    if (!selectedNodeId) return [];
    return getImmediateDownstream(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  const higherDownstream = useMemo(() => {
    if (!selectedNodeId) return [];
    const allWithDegrees = getDownstreamWithDegrees(graph, selectedNodeId);
    return allWithDegrees.filter(item => item.degree > 1);
  }, [graph, selectedNodeId]);

  const unconnectedUpstream = useMemo(() => {
    if (!selectedNodeId) return [];
    return getUnconnectedUpstream(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  const unconnectedDownstream = useMemo(() => {
    if (!selectedNodeId) return [];
    return getUnconnectedDownstream(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  // Compute "other" nodes - not connected upstream or downstream
  const otherNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const upstreamIds = new Set([
      ...immediateUpstream.map(n => n.id),
      ...higherUpstream.map(item => item.node.id)
    ]);
    const downstreamIds = new Set([
      ...immediateDownstream.map(n => n.id),
      ...higherDownstream.map(item => item.node.id)
    ]);
    return graph.nodes.filter(n =>
      n.id !== selectedNodeId &&
      !upstreamIds.has(n.id) &&
      !downstreamIds.has(n.id)
    );
  }, [graph.nodes, selectedNodeId, immediateUpstream, higherUpstream, immediateDownstream, higherDownstream]);

  // Handlers
  const handleNodeSelect = useCallback((nodeId: string) => {
    if (consolidationMode) {
      // In consolidation mode, toggle node selection
      setSelectedNodeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
        } else {
          newSet.add(nodeId);
        }
        return newSet;
      });
      // Also set as primary selected for display purposes
      setSelectedNodeId(nodeId);
    } else {
      // Normal mode - single selection
      setSelectedNodeId(nodeId);
      // Clear proposals when selecting a new node
      setProposals([]);
      setExistingNodeProposals([]);
    }
  }, [consolidationMode]);

  // Toggle consolidation mode
  const handleToggleConsolidationMode = useCallback(() => {
    setConsolidationMode(prev => {
      if (prev) {
        // Exiting consolidation mode - clear selections
        setSelectedNodeIds(new Set());
        setCondensedProposal(null);
        setConsolidateHint('');
      } else {
        // Entering consolidation mode - start with current selection if any
        if (selectedNodeId) {
          setSelectedNodeIds(new Set([selectedNodeId]));
        }
        // Exit expand mode
        setExpandMode(false);
        setExpansionProposal(null);
      }
      return !prev;
    });
  }, [selectedNodeId]);

  // Propose condensed node
  const handleProposeCondensed = useCallback(async () => {
    if (selectedNodeIds.size < 2) {
      setError('Select at least 2 nodes to condense');
      return;
    }

    setIsCondensing(true);
    setError(null);
    setCondensedProposal(null);

    try {
      const nodesToCondense = graph.nodes.filter(n => selectedNodeIds.has(n.id));
      const proposal = await proposeCondensedNode(
        graph.experimentalContext,
        nodesToCondense,
        graph.nodes,
        graph.edges,
        consolidateHint || undefined
      );
      setCondensedProposal(proposal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to propose condensed node';
      setError(message);
    } finally {
      setIsCondensing(false);
    }
  }, [selectedNodeIds, graph]);

  // Toggle expand mode
  const handleToggleExpandMode = useCallback(() => {
    setExpandMode(prev => {
      if (prev) {
        // Exiting expand mode
        setExpansionProposal(null);
        setExpandHint('');
      }
      return !prev;
    });
    // Exit consolidation mode if entering expand mode
    if (!expandMode) {
      setConsolidationMode(false);
      setSelectedNodeIds(new Set());
      setCondensedProposal(null);
    }
  }, [expandMode]);

  // Propose expansion
  const handleProposeExpansion = useCallback(async () => {
    if (!selectedNode) {
      setError('Select a node to expand');
      return;
    }

    setIsExpanding(true);
    setError(null);
    setExpansionProposal(null);

    try {
      const proposal = await proposeNodeExpansion(
        graph.experimentalContext,
        selectedNode,
        graph.nodes,
        graph.edges,
        expandLevel,
        expandHint || undefined
      );
      setExpansionProposal(proposal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to propose expansion';
      setError(message);
    } finally {
      setIsExpanding(false);
    }
  }, [selectedNode, graph, expandLevel]);

  // Accept expansion
  const handleAcceptExpansion = useCallback(() => {
    if (!expansionProposal || !selectedNode) return;

    const nodeToExpandId = selectedNode.id;

    // Find existing connections to the node being expanded
    const incomingEdges = graph.edges.filter(e => e.target === nodeToExpandId);
    const outgoingEdges = graph.edges.filter(e => e.source === nodeToExpandId);

    // Get parent and child nodes from proposal
    const parentNodes = expansionProposal.nodes.filter(n => n.role === 'parent');
    const childNodes = expansionProposal.nodes.filter(n => n.role === 'child');

    // Create new nodes with positions spread around the original node position
    const originalPos = selectedNode.position || { x: 0, y: 0 };
    const newNodes: CausalNode[] = expansionProposal.nodes.map((n, i) => {
      // Position based on role
      let xOffset = 0;
      let yOffset = 0;
      if (n.role === 'parent') {
        yOffset = -100;
        xOffset = (parentNodes.indexOf(n) - (parentNodes.length - 1) / 2) * 150;
      } else if (n.role === 'child') {
        yOffset = 100;
        xOffset = (childNodes.indexOf(n) - (childNodes.length - 1) / 2) * 150;
      } else {
        // internal - center
        xOffset = (i % 3 - 1) * 100;
      }

      return {
        id: n.id,
        variableName: n.id,
        displayName: n.displayName,
        description: n.description,
        position: {
          x: originalPos.x + xOffset,
          y: originalPos.y + yOffset
        }
      };
    });

    // Create edges from proposal
    const proposalEdges = expansionProposal.edges.map((e, i) => ({
      id: `expand-edge-${i}-${Date.now()}`,
      source: e.source,
      target: e.target
    }));

    // Redirect incoming edges to parent nodes (or first node if no parents)
    const targetNodes = parentNodes.length > 0 ? parentNodes : [expansionProposal.nodes[0]];
    const redirectedIncoming = incomingEdges.flatMap(e =>
      targetNodes.map((t, i) => ({
        ...e,
        id: `redirect-in-${e.id}-${i}`,
        target: t.id
      }))
    );

    // Redirect outgoing edges from child nodes (or last node if no children)
    const sourceNodes = childNodes.length > 0 ? childNodes : [expansionProposal.nodes[expansionProposal.nodes.length - 1]];
    const redirectedOutgoing = outgoingEdges.flatMap(e =>
      sourceNodes.map((s, i) => ({
        ...e,
        id: `redirect-out-${e.id}-${i}`,
        source: s.id
      }))
    );

    // Combine all edges, remove duplicates and self-loops
    let allNewEdges = [...proposalEdges, ...redirectedIncoming, ...redirectedOutgoing];
    allNewEdges = allNewEdges.filter(e => e.source !== e.target);
    const edgeSet = new Set<string>();
    allNewEdges = allNewEdges.filter(e => {
      const key = `${e.source}->${e.target}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    // Remove old node and edges, add new ones
    const remainingEdges = graph.edges.filter(e =>
      e.source !== nodeToExpandId && e.target !== nodeToExpandId
    );

    setGraph({
      ...graph,
      nodes: [
        ...graph.nodes.filter(n => n.id !== nodeToExpandId),
        ...newNodes
      ],
      edges: [...remainingEdges, ...allNewEdges]
    });

    // Clean up
    setExpandMode(false);
    setExpansionProposal(null);
    setSelectedNodeId(newNodes[0]?.id || null);
  }, [expansionProposal, selectedNode, graph]);

  // Accept condensed node
  const handleAcceptCondensed = useCallback(() => {
    if (!condensedProposal) return;

    const selectedIds = selectedNodeIds;

    // Create new condensed node
    const newNode: CausalNode = {
      id: condensedProposal.id,
      variableName: condensedProposal.id,
      displayName: condensedProposal.displayName,
      description: condensedProposal.description,
      position: {
        // Average position of selected nodes
        x: graph.nodes.filter(n => selectedIds.has(n.id)).reduce((sum, n) => sum + (n.position?.x || 0), 0) / selectedIds.size,
        y: graph.nodes.filter(n => selectedIds.has(n.id)).reduce((sum, n) => sum + (n.position?.y || 0), 0) / selectedIds.size
      }
    };

    // Redirect edges and create new graph
    let newEdges = graph.edges.map(e => {
      let source = e.source;
      let target = e.target;

      // Redirect edges from selected nodes to new node
      if (selectedIds.has(e.source)) {
        source = condensedProposal.id;
      }
      if (selectedIds.has(e.target)) {
        target = condensedProposal.id;
      }

      return { ...e, source, target };
    });

    // Remove self-loops (edges where source = target)
    newEdges = newEdges.filter(e => e.source !== e.target);

    // Remove duplicate edges
    const edgeSet = new Set<string>();
    newEdges = newEdges.filter(e => {
      const key = `${e.source}->${e.target}`;
      if (edgeSet.has(key)) return false;
      edgeSet.add(key);
      return true;
    });

    // Remove selected nodes, add new condensed node
    const newNodes = [
      ...graph.nodes.filter(n => !selectedIds.has(n.id)),
      newNode
    ];

    setGraph({
      ...graph,
      nodes: newNodes,
      edges: newEdges
    });

    // Clean up state
    setConsolidationMode(false);
    setSelectedNodeIds(new Set());
    setCondensedProposal(null);
    setSelectedNodeId(condensedProposal.id);
  }, [condensedProposal, selectedNodeIds, graph]);

  const handleGenerateProposals = useCallback(async (
    direction: 'upstream' | 'downstream',
    config: ProposalConfig
  ) => {
    if (!selectedNode) return;

    setIsGenerating(true);
    setGeneratingDirection(direction);
    setProposals([]);
    setError(null);

    try {
      // Build graph context using Pearl terminology
      const graphContext: GraphContext = {
        parents: immediateUpstream,
        ancestors: higherUpstream.map(item => item.node),
        children: immediateDownstream,
        descendants: higherDownstream.map(item => item.node),
        otherNodes: otherNodes
      };

      await generateAndAssessProposals(
        graph.experimentalContext,
        selectedNode,
        graphContext,
        proposals,
        graph.nodes,
        graph.edges,
        (consolidatedProposals) => {
          // Replace with consolidated list from critic
          setProposals(consolidatedProposals);
        },
        config,
        direction
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate proposals';
      setError(message);
      console.error('Error generating proposals:', err);
    } finally {
      setIsGenerating(false);
      setGeneratingDirection(null);
    }
  }, [selectedNode, graph, immediateUpstream, immediateDownstream, higherUpstream, higherDownstream, otherNodes, proposals]);

  const handleEvaluateExisting = useCallback(async (direction: 'upstream' | 'downstream') => {
    if (!selectedNode) return;

    setIsGenerating(true);
    setGeneratingDirection(direction);
    setError(null);

    try {
      const candidateNodes = direction === 'upstream'
        ? unconnectedUpstream
        : unconnectedDownstream;

      const results = await evaluateExistingNodes(
        graph.experimentalContext,
        selectedNode,
        candidateNodes,
        direction,
        graph.nodes,
        graph.edges
      );

      setExistingNodeProposals(prev => [
        ...prev.filter(p => p.direction !== direction),
        ...results
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to evaluate nodes';
      setError(message);
      console.error('Error evaluating nodes:', err);
    } finally {
      setIsGenerating(false);
      setGeneratingDirection(null);
    }
  }, [selectedNode, graph, unconnectedUpstream, unconnectedDownstream]);

  const handleAddEdge = useCallback((sourceId: string, targetId: string) => {
    setGraph(prev => {
      const result = addEdgeSafe(prev, sourceId, targetId);
      if (!result.success) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => setError(result.error || 'Failed to add edge'), 0);
        return prev;
      }
      return result.graph;
    });
    // Remove from existing proposals if it was there
    setExistingNodeProposals(prev =>
      prev.filter(p => !(p.nodeId === sourceId || p.nodeId === targetId))
    );
  }, []);

  const handleRemoveEdge = useCallback((sourceId: string, targetId: string) => {
    setGraph(prev => removeEdge(prev, sourceId, targetId));
    setError(null);
  }, []);

  const handleAddProposal = useCallback((proposal: Proposal) => {
    // Check if node with this ID already exists
    const existingNode = getNode(graph, proposal.variableName);
    if (existingNode) {
      setError(`A node with ID "${proposal.variableName}" already exists`);
      return;
    }

    // Create new node from proposal
    const newNode: CausalNode = {
      id: proposal.variableName,
      variableName: proposal.variableName,
      displayName: proposal.displayName,
      description: proposal.rationale,
      // Position will be set by auto-layout or drag
      position: {
        x: Math.random() * 200,
        y: Math.random() * 200 + 50
      }
    };

    // Add node and edge to graph based on direction
    let newGraph = addNode(graph, newNode);
    if (proposal.direction === 'downstream') {
      // New node is an effect: selectedNode -> newNode
      newGraph = addEdge(newGraph, proposal.targetNodeId, newNode.id);
    } else {
      // New node is a cause: newNode -> selectedNode
      newGraph = addEdge(newGraph, newNode.id, proposal.targetNodeId);
    }
    setGraph(newGraph);

    // Remove the added proposal from the list
    setProposals(prev => prev.filter(p => p.id !== proposal.id));
    setError(null);
  }, [graph]);

  const handleContextChange = useCallback((newContext: string) => {
    setGraph(prev => ({
      ...prev,
      experimentalContext: newContext
    }));
  }, []);

  const handleNodePositionsChange = useCallback((positions: Record<string, { x: number; y: number }>) => {
    setGraph(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => ({
        ...node,
        position: positions[node.id] || node.position
      }))
    }));
  }, []);

  const handleSaveGraph = useCallback(() => {
    const dataStr = JSON.stringify(graph, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `causal-graph-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [graph]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = experimentPresets.find(p => p.id === presetId);
    if (preset) {
      setGraph(preset.graph);
      setSelectedNodeId(null);
      setProposals([]);
      setExistingNodeProposals([]);
      setError(null);
    }
  }, []);

  const handleNewGraph = useCallback(() => {
    if (!confirmNewGraph) {
      setConfirmNewGraph(true);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setConfirmNewGraph(false), 3000);
      return;
    }
    setGraph({
      nodes: [],
      edges: [],
      experimentalContext: 'Describe your experiment here...'
    });
    setSelectedNodeId(null);
    setProposals([]);
    setExistingNodeProposals([]);
    setConfirmNewGraph(false);
  }, [confirmNewGraph]);

  const handleAddNewNode = useCallback((
    nodeData: { displayName: string; variableName: string; description: string },
    parentIds: string[],
    childIds: string[]
  ) => {
    const newNode: CausalNode = {
      id: nodeData.variableName,
      variableName: nodeData.variableName,
      displayName: nodeData.displayName,
      description: nodeData.description,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
    };

    const newEdges = [
      ...parentIds.map(parentId => ({
        id: `edge-${parentId}-${newNode.id}`,
        source: parentId,
        target: newNode.id
      })),
      ...childIds.map(childId => ({
        id: `edge-${newNode.id}-${childId}`,
        source: newNode.id,
        target: childId
      }))
    ];

    setGraph(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      edges: [...prev.edges, ...newEdges]
    }));
    setShowAddNode(false);
    setSelectedNodeId(newNode.id);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Recovery Prompt */}
      {showRecoveryPrompt && recoveryData && (
        <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">
              Found auto-saved graph from {new Date(recoveryData.timestamp).toLocaleString()} ({recoveryData.graph.nodes.length} nodes)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRecoverGraph}
              className="px-3 py-1 bg-white text-blue-600 text-sm font-medium rounded hover:bg-blue-50"
            >
              Restore
            </button>
            <button
              onClick={handleDismissRecovery}
              className="px-3 py-1 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* App Title */}
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-wide">Causeway</h1>
          <button
            onClick={() => setShowHelp(true)}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title="Help"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <span className="text-xs text-slate-400">
            Credit to conversations with Amanda Volk & Kevin Tran for idea
          </span>
        </div>

        {/* Token Usage Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tokens:</span>
            <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">
              {tokenUsage.totalTokens.toLocaleString()}
            </span>
            <span className="text-slate-500">
              ({tokenUsage.promptTokens.toLocaleString()}↑ {tokenUsage.completionTokens.toLocaleString()}↓)
            </span>
          </div>
          {tokenUsage.totalTokens > 0 && (
            <button
              onClick={() => resetSessionTokenUsage()}
              className="text-xs text-slate-400 hover:text-slate-200 px-1"
              title="Reset token counter"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-100 border-b border-red-300 px-4 py-2 flex items-center justify-between">
          <span className="text-red-800 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Experiment Context Header */}
      <ContextHeader
        context={graph.experimentalContext}
        onContextChange={handleContextChange}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <GraphCanvas
            graph={graph}
            selectedNodeId={selectedNodeId}
            selectedNodeIds={consolidationMode ? selectedNodeIds : undefined}
            consolidationMode={consolidationMode}
            expandMode={expandMode}
            onNodeSelect={handleNodeSelect}
            onNodePositionsChange={handleNodePositionsChange}
            immediateDownstream={immediateDownstream}
            higherDownstream={higherDownstream}
          />
          {/* Top-right controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* New Graph button */}
            <button
              onClick={handleNewGraph}
              onBlur={() => setTimeout(() => setConfirmNewGraph(false), 150)}
              className={`px-3 py-1.5 text-white text-sm font-medium rounded-md shadow-sm flex items-center gap-2 transition-colors ${
                confirmNewGraph
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              {confirmNewGraph ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Confirm?
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  New
                </>
              )}
            </button>

            {/* Add Node button */}
            <button
              onClick={() => setShowAddNode(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Node
            </button>

            {/* Expand Mode Toggle */}
            <button
              onClick={handleToggleExpandMode}
              disabled={!selectedNodeId && !expandMode}
              className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm flex items-center gap-2 ${
                expandMode
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {expandMode ? 'Exit Expand' : 'Expand'}
            </button>

            {/* Consolidation Mode Toggle */}
            <button
              onClick={handleToggleConsolidationMode}
              className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm flex items-center gap-2 ${
                consolidationMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              {consolidationMode ? 'Exit Consolidate' : 'Consolidate'}
            </button>

            {/* Build from Data button */}
            <button
              onClick={() => setShowBuildWizard(true)}
              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Build from Data
            </button>

            {/* Preset selector */}
            <select
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 shadow-sm cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>Load Preset...</option>
              {experimentPresets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            {/* Save button */}
            <button
              onClick={handleSaveGraph}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save
            </button>

            {/* Whyzen Export button */}
            <button
              onClick={() => setShowWhyzenExport(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Whyzen
            </button>
          </div>

          {/* Expand Panel */}
          {expandMode && selectedNode && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border-2 border-yellow-400 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-700 mb-1">
                    Expand Mode
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Expanding: <span className="font-medium text-yellow-800">{selectedNode.displayName}</span>
                  </p>

                  {/* Level selector */}
                  <div className="flex gap-2 mb-3">
                    {(['light', 'medium', 'heavy'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => {
                          setExpandLevel(level);
                          setExpansionProposal(null);
                        }}
                        className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                          expandLevel === level
                            ? 'bg-yellow-500 text-white'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                    <span className="text-xs text-gray-500 ml-2 self-center">
                      {expandLevel === 'light' && '2-3 nodes'}
                      {expandLevel === 'medium' && '3-5 nodes'}
                      {expandLevel === 'heavy' && '5-8 nodes'}
                    </span>
                  </div>

                  {/* Optional hint input */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">
                      Hint <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={expandHint}
                      onChange={(e) => setExpandHint(e.target.value)}
                      placeholder="e.g., 'focus on molecular mechanisms' or 'include temporal factors'"
                      className="w-full px-3 py-1.5 text-sm border border-yellow-200 rounded-md focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 focus:outline-none"
                    />
                  </div>

                  {/* Expansion proposal preview */}
                  {expansionProposal && (
                    <div className="p-3 bg-yellow-50 rounded-md mb-3 max-h-48 overflow-y-auto">
                      <div className="text-xs font-medium text-yellow-900 mb-2">
                        Proposed: {expansionProposal.nodes.length} nodes, {expansionProposal.edges.length} edges
                      </div>

                      {/* Nodes by role */}
                      {['parent', 'internal', 'child'].map(role => {
                        const nodesOfRole = expansionProposal.nodes.filter(n => n.role === role);
                        if (nodesOfRole.length === 0) return null;
                        return (
                          <div key={role} className="mb-2">
                            <div className="text-xs font-medium text-gray-500 capitalize mb-1">
                              {role === 'parent' ? 'Upstream (causes)' : role === 'child' ? 'Downstream (effects)' : 'Internal (mediators)'}:
                            </div>
                            {nodesOfRole.map(n => (
                              <div key={n.id} className="text-xs text-yellow-800 ml-2">
                                • {n.displayName}
                              </div>
                            ))}
                          </div>
                        );
                      })}

                      <div className="text-xs text-gray-500 mt-2 italic">{expansionProposal.rationale}</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleProposeExpansion}
                    disabled={isExpanding}
                    className="px-4 py-2 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExpanding ? 'Proposing...' : expansionProposal ? 'Re-propose' : 'Propose'}
                  </button>

                  {expansionProposal && (
                    <button
                      onClick={handleAcceptExpansion}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      Accept
                    </button>
                  )}

                  <button
                    onClick={handleToggleExpandMode}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Consolidation Panel */}
          {consolidationMode && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-purple-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-purple-800 mb-1">
                    Consolidation Mode
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Click nodes to select them for consolidation. Selected: {selectedNodeIds.size} node{selectedNodeIds.size !== 1 ? 's' : ''}
                  </p>

                  {/* Selected nodes list */}
                  {selectedNodeIds.size > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {Array.from(selectedNodeIds).map(id => {
                        const node = graph.nodes.find(n => n.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full"
                          >
                            {node?.displayName || id}
                            <button
                              onClick={() => setSelectedNodeIds(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(id);
                                return newSet;
                              })}
                              className="hover:text-purple-600"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Optional hint input */}
                  <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">
                      Hint <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={consolidateHint}
                      onChange={(e) => setConsolidateHint(e.target.value)}
                      placeholder="e.g., 'name it based on function' or 'emphasize the regulatory aspect'"
                      className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded-md focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none"
                    />
                  </div>

                  {/* Condensed proposal preview */}
                  {condensedProposal && (
                    <div className="p-3 bg-purple-50 rounded-md mb-3">
                      <div className="text-sm font-medium text-purple-900">{condensedProposal.displayName}</div>
                      <div className="text-xs text-purple-700 mt-1">{condensedProposal.description}</div>
                      <div className="text-xs text-gray-500 mt-2 italic">{condensedProposal.rationale}</div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleProposeCondensed}
                    disabled={selectedNodeIds.size < 2 || isCondensing}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCondensing ? 'Proposing...' : 'Propose'}
                  </button>

                  {condensedProposal && (
                    <button
                      onClick={handleAcceptCondensed}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      Accept
                    </button>
                  )}

                  <button
                    onClick={handleToggleConsolidationMode}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <SidePanel
          selectedNode={selectedNode}
          graph={graph}
          parents={immediateUpstream}
          ancestors={higherUpstream}
          childNodes={immediateDownstream}
          descendants={higherDownstream}
          unconnectedUpstream={unconnectedUpstream}
          unconnectedDownstream={unconnectedDownstream}
          onNodeSelect={handleNodeSelect}
          onAddEdge={handleAddEdge}
          onRemoveEdge={handleRemoveEdge}
          onGenerateProposals={handleGenerateProposals}
          onEvaluateExisting={handleEvaluateExisting}
          isGenerating={isGenerating}
          generatingDirection={generatingDirection}
          existingNodeProposals={existingNodeProposals}
        >
          <ProposalList
            proposals={proposals}
            onAddProposal={handleAddProposal}
            isGenerating={isGenerating}
            experimentalContext={graph.experimentalContext}
            allNodes={graph.nodes}
          />
        </SidePanel>
      </div>

      {/* Build from Data Wizard */}
      <BuildFromDataWizard
        isOpen={showBuildWizard}
        onClose={() => setShowBuildWizard(false)}
        onPreviewGraph={(graph) => {
          // Show graph in main view for preview (don't close wizard)
          setGraph(graph);
          setSelectedNodeId(null);
          setProposals([]);
          setExistingNodeProposals([]);
        }}
        onGraphBuilt={(graph) => {
          setGraph(graph);
          setShowBuildWizard(false);
          setSelectedNodeId(null);
          setProposals([]);
          setExistingNodeProposals([]);
        }}
      />

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Add Node Modal */}
      <AddNodeModal
        isOpen={showAddNode}
        onClose={() => setShowAddNode(false)}
        graph={graph}
        onAddNode={handleAddNewNode}
      />

      {/* Whyzen Export Wizard */}
      <WhyzenExportWizard
        isOpen={showWhyzenExport}
        onClose={() => setShowWhyzenExport(false)}
        graph={graph}
      />
    </div>
  );
}

export default App;
