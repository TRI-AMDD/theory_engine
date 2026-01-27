import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CausalNode, CausalGraph, ProposalConfig, ExistingNodeProposal } from '../types';
import type { NodeWithDegree } from '../utils/graph';
import { wouldCreateCycle } from '../utils/graph';
import { generatePedagogicalExplanation, type PedagogicalExplanation } from '../services/api';
import { ExplanationModal } from './ProposalList';

interface SidePanelProps {
  selectedNode: CausalNode | null;
  graph: CausalGraph;  // Needed for cycle detection
  // Current connections (Pearl terminology)
  parents: CausalNode[];           // Direct causes
  ancestors: NodeWithDegree[];     // Indirect causes
  childNodes: CausalNode[];        // Direct effects (renamed to avoid React children conflict)
  descendants: NodeWithDegree[];   // Indirect effects
  // Unconnected nodes for manual adding
  unconnectedUpstream: CausalNode[];
  unconnectedDownstream: CausalNode[];
  // Actions
  onNodeSelect: (nodeId: string) => void;
  onAddEdge: (sourceId: string, targetId: string) => void;
  onRemoveEdge: (sourceId: string, targetId: string) => void;
  onGenerateProposals: (direction: 'upstream' | 'downstream', config: ProposalConfig) => void;
  onEvaluateExisting: (direction: 'upstream' | 'downstream') => void;
  onDeleteNode: (nodeId: string) => void;
  // State
  isGenerating: boolean;
  generatingDirection: 'upstream' | 'downstream' | null;
  // Existing node proposals
  existingNodeProposals: ExistingNodeProposal[];
  // Children for new node proposals
  children?: React.ReactNode;
}

// Collapsible section component
const CollapsibleSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: number;
}> = ({ title, defaultOpen = false, children, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
          {title}
          {badge !== undefined && badge > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              {badge}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-6 pb-4">{children}</div>}
    </div>
  );
};

// Spinner component
const Spinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Cycle icon - shown when adding an edge would create a cycle
const CycleIcon: React.FC = () => (
  <div
    className="ml-2 px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded border border-gray-200 flex items-center gap-1 cursor-not-allowed"
    title="Would create a cycle"
  >
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  </div>
);

// Likelihood badge colors
function getLikelihoodStyle(likelihood: 'high' | 'medium' | 'low') {
  switch (likelihood) {
    case 'high': return 'bg-green-100 text-green-800 border-green-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low': return 'bg-red-100 text-red-800 border-red-300';
  }
}

// Relationship-based colors (matching graph colors)
type NodeRelation = 'parent' | 'ancestor' | 'child' | 'descendant' | 'unconnected';

function getRelationStyle(relation: NodeRelation): string {
  switch (relation) {
    case 'parent': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'ancestor': return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'child': return 'bg-red-100 text-red-800 border-red-300';
    case 'descendant': return 'bg-pink-100 text-pink-800 border-pink-300';
    case 'unconnected': return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getRelationLabel(relation: NodeRelation): string {
  switch (relation) {
    case 'parent': return 'Parent';
    case 'ancestor': return 'Ancestor';
    case 'child': return 'Child';
    case 'descendant': return 'Descendant';
    case 'unconnected': return '';
  }
}

export const SidePanel: React.FC<SidePanelProps> = ({
  selectedNode,
  graph,
  parents,
  ancestors,
  childNodes,
  descendants,
  unconnectedUpstream,
  unconnectedDownstream,
  onNodeSelect,
  onAddEdge,
  onRemoveEdge,
  onGenerateProposals,
  onEvaluateExisting,
  onDeleteNode,
  isGenerating,
  generatingDirection,
  existingNodeProposals,
  children,
}) => {
  // Config state
  const [numCycles, setNumCycles] = useState(2);
  const [numProposalsPerCycle, setNumProposalsPerCycle] = useState(4);

  // Ref for auto-scroll to proposals
  const proposalsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to proposals when generation starts
  useEffect(() => {
    if (isGenerating && proposalsRef.current) {
      proposalsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isGenerating]);

  // Explanation modal state
  const [explainNode, setExplainNode] = useState<CausalNode | null>(null);
  const [explanation, setExplanation] = useState<PedagogicalExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  // Handle explain click for any node
  const handleExplainNode = async (node: CausalNode) => {
    setExplainNode(node);
    setExplanation(null);
    setExplanationError(null);
    setIsLoadingExplanation(true);

    try {
      const result = await generatePedagogicalExplanation(
        graph.experimentalContext,
        node.displayName,
        node.description,
        graph.nodes
      );
      setExplanation(result);
    } catch (err) {
      setExplanationError(err instanceof Error ? err.message : 'Failed to generate explanation');
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleCloseExplanation = () => {
    setExplainNode(null);
    setExplanation(null);
    setExplanationError(null);
  };

  // Categorize nodes by their relationship to selected node
  const categorizedNodes = useMemo(() => {
    if (!selectedNode) return { forParent: [], forChild: [] };

    const parentIds = new Set(parents.map(n => n.id));
    const childIds = new Set(childNodes.map(n => n.id));

    type CategorizedNode = {
      node: CausalNode;
      relation: NodeRelation;
      canAddAsParent: boolean;
      canAddAsChild: boolean;
      wouldCycleAsParent: boolean;
      wouldCycleAsChild: boolean;
    };

    const allCategorized: CategorizedNode[] = [];

    // Add parents - already direct causes, can't add as parent again, but could add as child
    parents.forEach(node => allCategorized.push({
      node,
      relation: 'parent',
      canAddAsParent: false,
      canAddAsChild: !childIds.has(node.id),
      wouldCycleAsParent: false,
      wouldCycleAsChild: wouldCreateCycle(graph, selectedNode.id, node.id)
    }));
    // Add ancestors - CAN be added as direct parents
    ancestors.forEach(item => allCategorized.push({
      node: item.node,
      relation: 'ancestor',
      canAddAsParent: !parentIds.has(item.node.id),
      canAddAsChild: !childIds.has(item.node.id),
      wouldCycleAsParent: wouldCreateCycle(graph, item.node.id, selectedNode.id),
      wouldCycleAsChild: wouldCreateCycle(graph, selectedNode.id, item.node.id)
    }));
    // Add children - already direct effects, can't add as child again, but could add as parent
    childNodes.forEach(node => allCategorized.push({
      node,
      relation: 'child',
      canAddAsParent: !parentIds.has(node.id),
      canAddAsChild: false,
      wouldCycleAsParent: wouldCreateCycle(graph, node.id, selectedNode.id),
      wouldCycleAsChild: false
    }));
    // Add descendants - CAN be added as direct children
    descendants.forEach(item => allCategorized.push({
      node: item.node,
      relation: 'descendant',
      canAddAsParent: !parentIds.has(item.node.id),
      canAddAsChild: !childIds.has(item.node.id),
      wouldCycleAsParent: wouldCreateCycle(graph, item.node.id, selectedNode.id),
      wouldCycleAsChild: wouldCreateCycle(graph, selectedNode.id, item.node.id)
    }));
    // Add unconnected nodes
    unconnectedUpstream.forEach(node => {
      const isAlreadyAdded = allCategorized.some(c => c.node.id === node.id);
      if (!isAlreadyAdded) {
        allCategorized.push({
          node,
          relation: 'unconnected',
          canAddAsParent: true,
          canAddAsChild: true,
          wouldCycleAsParent: wouldCreateCycle(graph, node.id, selectedNode.id),
          wouldCycleAsChild: wouldCreateCycle(graph, selectedNode.id, node.id)
        });
      }
    });

    // For "Add Parent": sort ancestors first (good candidates), then unconnected, then children/descendants
    const forParent = [...allCategorized].sort((a, b) => {
      const order: Record<NodeRelation, number> = {
        ancestor: 0, parent: 1, unconnected: 2, child: 3, descendant: 4
      };
      return order[a.relation] - order[b.relation];
    });

    // For "Add Child": sort descendants first (good candidates), then unconnected, then parents/ancestors
    const forChild = [...allCategorized].sort((a, b) => {
      const order: Record<NodeRelation, number> = {
        descendant: 0, child: 1, unconnected: 2, parent: 3, ancestor: 4
      };
      return order[a.relation] - order[b.relation];
    });

    return { forParent, forChild };
  }, [selectedNode, graph, parents, ancestors, childNodes, descendants, unconnectedUpstream]);

  if (!selectedNode) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 p-6 flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Select a node to view details
        </p>
      </div>
    );
  }

  const upstreamExistingProposals = existingNodeProposals.filter(p => p.direction === 'upstream');
  const downstreamExistingProposals = existingNodeProposals.filter(p => p.direction === 'downstream');

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Selected Node Details */}
      <div className="p-6 border-b border-gray-200 bg-gray-50 relative">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 pr-8">
          {selectedNode.displayName}
        </h2>
        <p className="text-sm text-gray-500 font-mono mb-3">
          {selectedNode.variableName}
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {selectedNode.description}
        </p>

        {/* Node action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={() => handleExplainNode(selectedNode)}
            className="p-1.5 text-gray-400 opacity-40 hover:opacity-100 hover:text-gray-600 transition-opacity"
            title="Learn more about this variable"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => onDeleteNode(selectedNode.id)}
            className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
          >
            Delete Node
          </button>
        </div>

        {/* Whyzen Metadata (if present) */}
        {selectedNode._whyzen && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-indigo-600 mb-2">Whyzen Metadata</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20">Node Type:</span>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono">
                  {selectedNode._whyzen.node_type}
                </span>
              </div>
              {selectedNode._whyzen.mechanism_type && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">Mechanism:</span>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-mono text-xs">
                    {selectedNode._whyzen.mechanism_type}
                  </span>
                </div>
              )}
              {selectedNode._whyzen.kernel_type && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20">Kernel:</span>
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-mono text-xs">
                    {selectedNode._whyzen.kernel_type}
                  </span>
                </div>
              )}
              {selectedNode._whyzen.kernel_params && Object.keys(selectedNode._whyzen.kernel_params).length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-20">Params:</span>
                  <span className="text-gray-700 font-mono">
                    {Object.entries(selectedNode._whyzen.kernel_params).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20">Level:</span>
                <span className={`px-1.5 py-0.5 rounded font-mono ${
                  selectedNode._whyzen.level === 'global' ? 'bg-blue-100 text-blue-700' :
                  selectedNode._whyzen.level === 'experiment' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {selectedNode._whyzen.level}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Config Controls */}
      <div className="px-6 py-3 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <span className="text-gray-600">Proposal agents:</span>
            <input
              type="number"
              min={1}
              max={8}
              value={numProposalsPerCycle}
              onChange={(e) => setNumProposalsPerCycle(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-center"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-gray-600">Cycles:</span>
            <input
              type="number"
              min={1}
              max={5}
              value={numCycles}
              onChange={(e) => setNumCycles(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-center"
            />
          </label>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ADD CAUSE Section */}
        <CollapsibleSection title="Add Parent/Ancestor" defaultOpen={true} badge={unconnectedUpstream.length}>
          {/* Existing nodes - colored by relationship, sorted for parent context */}
          {categorizedNodes.forParent.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Existing nodes (colored by relationship):</p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {categorizedNodes.forParent.map(({ node, relation, canAddAsParent, wouldCycleAsParent }) => (
                  <li
                    key={node.id}
                    className={`flex items-center justify-between px-2 py-1 rounded border ${getRelationStyle(relation)}`}
                  >
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="text-sm truncate flex-1 text-left flex items-center gap-2"
                    >
                      <span>{node.displayName}</span>
                      {relation !== 'unconnected' && (
                        <span className="text-xs opacity-70">({getRelationLabel(relation)})</span>
                      )}
                    </button>
                    {canAddAsParent && !wouldCycleAsParent && (
                      <button
                        onClick={() => onAddEdge(node.id, selectedNode.id)}
                        className="ml-2 px-2 py-0.5 text-xs text-blue-600 bg-white rounded border border-blue-300 hover:bg-blue-50"
                      >
                        + Add
                      </button>
                    )}
                    {canAddAsParent && wouldCycleAsParent && <CycleIcon />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evaluate existing nodes */}
          <button
            onClick={() => onEvaluateExisting('upstream')}
            disabled={isGenerating || unconnectedUpstream.length === 0}
            className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Evaluate as Parents
          </button>

          {/* Show existing node proposals */}
          {upstreamExistingProposals.length > 0 && (
            <div className="mb-3 space-y-2">
              {upstreamExistingProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`p-2 rounded border ${getLikelihoodStyle(proposal.likelihood)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{proposal.displayName}</span>
                    <button
                      onClick={() => onAddEdge(proposal.nodeId, selectedNode.id)}
                      className="px-2 py-0.5 text-xs bg-white rounded border hover:bg-gray-50"
                    >
                      + Add
                    </button>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{proposal.rationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* Propose new causes */}
          <button
            onClick={() => onGenerateProposals('upstream', { numCycles, numProposalsPerCycle })}
            disabled={isGenerating}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating && generatingDirection === 'upstream' && <Spinner />}
            Propose New Parents
          </button>
        </CollapsibleSection>

        {/* ADD EFFECT Section */}
        <CollapsibleSection title="Add Child/Descendant" badge={unconnectedDownstream.length}>
          {/* Existing nodes - colored by relationship, sorted for child context */}
          {categorizedNodes.forChild.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Existing nodes (colored by relationship):</p>
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {categorizedNodes.forChild.map(({ node, relation, canAddAsChild, wouldCycleAsChild }) => (
                  <li
                    key={node.id}
                    className={`flex items-center justify-between px-2 py-1 rounded border ${getRelationStyle(relation)}`}
                  >
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="text-sm truncate flex-1 text-left flex items-center gap-2"
                    >
                      <span>{node.displayName}</span>
                      {relation !== 'unconnected' && (
                        <span className="text-xs opacity-70">({getRelationLabel(relation)})</span>
                      )}
                    </button>
                    {canAddAsChild && !wouldCycleAsChild && (
                      <button
                        onClick={() => onAddEdge(selectedNode.id, node.id)}
                        className="ml-2 px-2 py-0.5 text-xs text-purple-600 bg-white rounded border border-purple-300 hover:bg-purple-50"
                      >
                        + Add
                      </button>
                    )}
                    {canAddAsChild && wouldCycleAsChild && <CycleIcon />}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evaluate existing nodes */}
          <button
            onClick={() => onEvaluateExisting('downstream')}
            disabled={isGenerating || unconnectedDownstream.length === 0}
            className="w-full mb-2 px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Evaluate as Children
          </button>

          {/* Show existing node proposals */}
          {downstreamExistingProposals.length > 0 && (
            <div className="mb-3 space-y-2">
              {downstreamExistingProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className={`p-2 rounded border ${getLikelihoodStyle(proposal.likelihood)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{proposal.displayName}</span>
                    <button
                      onClick={() => onAddEdge(selectedNode.id, proposal.nodeId)}
                      className="px-2 py-0.5 text-xs bg-white rounded border hover:bg-gray-50"
                    >
                      + Add
                    </button>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{proposal.rationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* Propose new effects */}
          <button
            onClick={() => onGenerateProposals('downstream', { numCycles, numProposalsPerCycle })}
            disabled={isGenerating}
            className="w-full px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating && generatingDirection === 'downstream' && <Spinner />}
            Propose New Children
          </button>
        </CollapsibleSection>

        {/* REMOVE CONNECTIONS Section */}
        <CollapsibleSection
          title="Remove Connections"
          badge={parents.length + childNodes.length}
        >
          {/* Connected upstream (causes) */}
          {parents.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Parents (direct causes):</p>
              <ul className="space-y-1">
                {parents.map((node) => (
                  <li key={node.id} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1 text-left"
                    >
                      {node.displayName} → here
                    </button>
                    <button
                      onClick={() => onRemoveEdge(node.id, selectedNode.id)}
                      className="ml-2 px-2 py-0.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Connected downstream (effects) */}
          {childNodes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Children (direct effects):</p>
              <ul className="space-y-1">
                {childNodes.map((node) => (
                  <li key={node.id} className="flex items-center justify-between bg-purple-50 rounded px-2 py-1">
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="text-sm text-gray-700 hover:text-purple-600 truncate flex-1 text-left"
                    >
                      here → {node.displayName}
                    </button>
                    <button
                      onClick={() => onRemoveEdge(selectedNode.id, node.id)}
                      className="ml-2 px-2 py-0.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parents.length === 0 && childNodes.length === 0 && (
            <p className="text-sm text-gray-500 italic">No connections to remove</p>
          )}
        </CollapsibleSection>

        {/* CURRENT RELATIONSHIPS Section */}
        <CollapsibleSection title="Causal Graph Context">
          {/* Higher upstream causes */}
          {ancestors.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Ancestors (indirect causes):</p>
              <ul className="space-y-1">
                {ancestors.map(({ node, degree }) => (
                  <li key={node.id}>
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 bg-gray-50 rounded hover:bg-blue-50 hover:text-blue-700 flex justify-between"
                    >
                      <span className="truncate">{node.displayName}</span>
                      <span className="text-gray-400 text-xs ml-2">({degree}↑)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Higher downstream effects */}
          {descendants.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Descendants (indirect effects):</p>
              <ul className="space-y-1">
                {descendants.map(({ node, degree }) => (
                  <li key={node.id}>
                    <button
                      onClick={() => onNodeSelect(node.id)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 bg-gray-50 rounded hover:bg-purple-50 hover:text-purple-700 flex justify-between"
                    >
                      <span className="truncate">{node.displayName}</span>
                      <span className="text-gray-400 text-xs ml-2">({degree}↓)</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ancestors.length === 0 && descendants.length === 0 && (
            <p className="text-sm text-gray-500 italic">No ancestors or descendants</p>
          )}
        </CollapsibleSection>

        {/* New Node Proposals (children slot) */}
        {children && (
          <div ref={proposalsRef} className="p-6 border-t border-gray-200">
            {children}
          </div>
        )}
      </div>

      {/* Explanation Modal */}
      {explainNode && (
        <ExplanationModal
          title={explainNode.displayName}
          explanation={explanation}
          isLoading={isLoadingExplanation}
          error={explanationError}
          onClose={handleCloseExplanation}
          nodeNames={graph.nodes.map(n => n.displayName)}
        />
      )}
    </div>
  );
};

export default SidePanel;
