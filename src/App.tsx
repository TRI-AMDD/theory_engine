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
  type GraphContext,
  type TokenUsage,
  subscribeToTokenUpdates,
  getSessionTokenUsage,
  resetSessionTokenUsage
} from './services/api';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { ProposalList } from './components/ProposalList';
import { ContextHeader } from './components/ContextHeader';
import { BuildFromDataWizard } from './components/BuildFromDataWizard';

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

  useEffect(() => {
    const unsubscribe = subscribeToTokenUpdates(setTokenUsage);
    return unsubscribe;
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
    setSelectedNodeId(nodeId);
    // Clear proposals when selecting a new node
    setProposals([]);
    setExistingNodeProposals([]);
  }, []);

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
        (proposal) => {
          setProposals(prev => [...prev, proposal]);
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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* App Title */}
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-wide">Causeway</h1>
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
            onNodeSelect={handleNodeSelect}
            onNodePositionsChange={handleNodePositionsChange}
            immediateDownstream={immediateDownstream}
            higherDownstream={higherDownstream}
          />
          {/* Top-right controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
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
          </div>
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
    </div>
  );
}

export default App;
