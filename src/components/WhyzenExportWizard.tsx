import React, { useState, useEffect, useMemo } from 'react';
import type { CausalGraph, CausalNode, WhyzenMetadata } from '../types';
import { generateWhyzenMetadata } from '../services/api';

interface WhyzenExportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  graph: CausalGraph;
}

// Node type options from Whyzen glossary
const NODE_TYPES = [
  { value: 'RootNode', label: 'RootNode', description: 'No parents, has uncertainty kernel' },
  { value: 'DeterministicRootNode', label: 'DeterministicRootNode', description: 'No parents, no uncertainty' },
  { value: 'Node', label: 'Node', description: 'Has parents, mechanism + kernel' },
  { value: 'DeterministicNode', label: 'DeterministicNode', description: 'Has parents, no uncertainty' },
] as const;

// Level options
const LEVELS = [
  { value: 'global', label: 'Global', description: 'Same value across all experiments' },
  { value: 'experiment', label: 'Experiment', description: 'Varies per experiment' },
  { value: 'timepoint', label: 'Timepoint', description: 'Varies per timepoint' },
] as const;

// Kernels from Whyzen glossary
const KERNELS = [
  { value: 'DeltaProbabilityKernel', label: 'Delta (No noise)', description: 'Point mass - deterministic' },
  { value: 'NormalProbabilityKernel', label: 'Normal', description: 'Gaussian with fixed std' },
  { value: 'LogNormalProbabilityKernel', label: 'LogNormal', description: 'Multiplicative noise, positive values' },
  { value: 'GammaProbabilityKernel', label: 'Gamma', description: 'Right-skewed, non-negative' },
  { value: 'UniformProbabilityKernel', label: 'Uniform', description: 'Equal probability in range' },
  { value: 'RelativeNormalProbabilityKernel', label: 'Relative Normal', description: 'Error proportional to value' },
  { value: 'FoldedNormalProbabilityKernel', label: 'Folded Normal', description: 'Normal folded to be positive' },
  { value: 'FoldedRelativeNormalProbabilityKernel', label: 'Folded Relative Normal', description: 'Proportional error, positive' },
  { value: 'BetaProbabilityKernel', label: 'Beta', description: 'For values in [0,1]' },
  { value: 'BernoulliProbabilityKernel', label: 'Bernoulli', description: 'Binary outcomes (0/1)' },
  { value: 'DirichletProbabilityKernel', label: 'Dirichlet', description: 'Compositional data' },
  { value: '__other__', label: 'Other...', description: 'Custom kernel (specify)' },
] as const;

// Mechanisms from Whyzen glossary
const MECHANISMS = [
  { value: 'RootValue', label: 'Root Value', description: 'Constant value for root nodes', category: 'core' },
  { value: 'IdentityMechanism', label: 'Identity', description: 'Pass-through unchanged', category: 'core' },
  { value: 'LinearMechanism', label: 'Linear', description: 'Multiply by weight', category: 'core' },
  { value: 'SummationMechanism', label: 'Summation', description: 'Sum all inputs', category: 'core' },
  { value: 'ProductMechanism', label: 'Product', description: 'Multiply all inputs', category: 'core' },
  { value: 'DivisionMechanism', label: 'Division', description: 'Numerator / denominator', category: 'core' },
  { value: 'SigmoidMechanism', label: 'Sigmoid', description: 'Logistic squashing to (0,1)', category: 'core' },
  { value: 'NeuralNetworkMechanism', label: 'Neural Network', description: 'Complex learned relationship', category: 'core' },
  { value: '__other__', label: 'Other...', description: 'Custom mechanism (specify)', category: 'other' },
] as const;

interface NodeMetadataState {
  nodeId: string;
  displayName: string;
  description: string;
  metadata: WhyzenMetadata;
  isExpanded: boolean;
  customKernel: string;
  customMechanism: string;
}

// Validation rules
interface ValidationResult {
  isComplete: boolean;
  missingFields: string[];
}

function validateNodeMetadata(state: NodeMetadataState, isRoot: boolean): ValidationResult {
  const missing: string[] = [];

  // Node type is always required
  if (!state.metadata.node_type) {
    missing.push('Node Type');
  }

  // Level is always required
  if (!state.metadata.level) {
    missing.push('Level');
  }

  // Kernel is required for non-deterministic nodes
  const isDeterministic = state.metadata.node_type?.includes('Deterministic');
  if (!isDeterministic && !state.metadata.kernel_type) {
    missing.push('Kernel');
  }

  // Mechanism is required for non-root nodes
  if (!isRoot && !state.metadata.mechanism_type) {
    missing.push('Mechanism');
  }

  // Check for "Other" selections without custom values
  if (state.metadata.kernel_type === '__other__' && !state.customKernel.trim()) {
    missing.push('Custom Kernel Name');
  }
  if (state.metadata.mechanism_type === '__other__' && !state.customMechanism.trim()) {
    missing.push('Custom Mechanism Name');
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

export const WhyzenExportWizard: React.FC<WhyzenExportWizardProps> = ({
  isOpen,
  onClose,
  graph,
}) => {
  const [nodeStates, setNodeStates] = useState<NodeMetadataState[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which nodes are roots
  const rootNodeIds = useMemo(() => {
    const hasParent = new Set(graph.edges.map(e => e.target));
    return new Set(graph.nodes.filter(n => !hasParent.has(n.id)).map(n => n.id));
  }, [graph]);

  // Initialize node states when graph changes or wizard opens
  useEffect(() => {
    if (isOpen && graph.nodes.length > 0) {
      const states: NodeMetadataState[] = graph.nodes.map(node => {
        const isRoot = rootNodeIds.has(node.id);

        // Use existing metadata or create defaults
        const existingMeta = node._whyzen;
        const defaultMeta: WhyzenMetadata = {
          node_type: isRoot ? 'RootNode' : 'Node',
          mechanism_type: isRoot ? null : null, // Leave blank so user must choose
          kernel_type: null, // Leave blank so user must choose
          kernel_params: {},
          level: 'experiment',
        };

        return {
          nodeId: node.id,
          displayName: node.displayName,
          description: node.description,
          metadata: existingMeta || defaultMeta,
          isExpanded: false,
          customKernel: '',
          customMechanism: '',
        };
      });

      setNodeStates(states);
    }
  }, [isOpen, graph, rootNodeIds]);

  // Calculate validation for all nodes
  const validationResults = useMemo(() => {
    const results = new Map<string, ValidationResult>();
    nodeStates.forEach(state => {
      results.set(state.nodeId, validateNodeMetadata(state, rootNodeIds.has(state.nodeId)));
    });
    return results;
  }, [nodeStates, rootNodeIds]);

  // Count complete vs incomplete
  const { completeCount, incompleteCount } = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    validationResults.forEach(result => {
      if (result.isComplete) complete++;
      else incomplete++;
    });
    return { completeCount: complete, incompleteCount: incomplete };
  }, [validationResults]);

  // Generate AI suggestions for all nodes
  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const hasParent = new Set(graph.edges.map(e => e.target));

      const suggestions = await generateWhyzenMetadata(
        graph.experimentalContext,
        graph.nodes,
        graph.edges,
        hasParent
      );

      setNodeStates(prev => prev.map(state => {
        const suggestion = suggestions.find(s => s.nodeId === state.nodeId);
        if (suggestion) {
          return {
            ...state,
            metadata: suggestion.metadata,
          };
        }
        return state;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate metadata');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update a single node's metadata
  const updateNodeMetadata = (nodeId: string, updates: Partial<WhyzenMetadata>) => {
    setNodeStates(prev => prev.map(state => {
      if (state.nodeId === nodeId) {
        return {
          ...state,
          metadata: { ...state.metadata, ...updates },
        };
      }
      return state;
    }));
  };

  // Update custom field
  const updateCustomField = (nodeId: string, field: 'customKernel' | 'customMechanism', value: string) => {
    setNodeStates(prev => prev.map(state => {
      if (state.nodeId === nodeId) {
        return { ...state, [field]: value };
      }
      return state;
    }));
  };

  // Toggle node expansion
  const toggleExpand = (nodeId: string) => {
    setNodeStates(prev => prev.map(state => {
      if (state.nodeId === nodeId) {
        return { ...state, isExpanded: !state.isExpanded };
      }
      return state;
    }));
  };

  // Update kernel param
  const updateKernelParam = (nodeId: string, key: string, value: string) => {
    setNodeStates(prev => prev.map(state => {
      if (state.nodeId === nodeId) {
        const newParams = { ...state.metadata.kernel_params, [key]: value };
        if (value === '') {
          delete newParams[key];
        }
        return {
          ...state,
          metadata: { ...state.metadata, kernel_params: newParams },
        };
      }
      return state;
    }));
  };

  // Export to Whyzen format
  const handleExport = () => {
    const whyzenGraph = {
      nodes: nodeStates.map(state => {
        const originalNode = graph.nodes.find(n => n.id === state.nodeId)!;

        // Resolve "Other" selections to actual values or placeholder
        let kernelType = state.metadata.kernel_type;
        let mechanismType = state.metadata.mechanism_type;

        if (kernelType === '__other__') {
          kernelType = state.customKernel.trim() || 'None';
        }
        if (mechanismType === '__other__') {
          mechanismType = state.customMechanism.trim() || 'None';
        }

        return {
          ...originalNode,
          _whyzen: {
            ...state.metadata,
            kernel_type: kernelType,
            mechanism_type: mechanismType,
          },
        };
      }),
      edges: graph.edges,
      experimentalContext: graph.experimentalContext,
    };

    const dataStr = JSON.stringify(whyzenGraph, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whyzen-graph-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-indigo-50">
          <div>
            <h2 className="text-lg font-semibold text-indigo-900">Export to Whyzen</h2>
            <p className="text-sm text-indigo-600">Configure node metadata before export</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Status bar and Generate button */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {nodeStates.length} node{nodeStates.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-700">{completeCount} complete</span>
              </span>
              {incompleteCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-700">{incompleteCount} incomplete</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isGenerating ? 'Generating...' : 'AI Suggest All'}
          </button>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {nodeStates.map(state => {
            const validation = validationResults.get(state.nodeId)!;
            const isRoot = rootNodeIds.has(state.nodeId);
            const isDeterministic = state.metadata.node_type?.includes('Deterministic');

            return (
              <div
                key={state.nodeId}
                className={`border-2 rounded-lg overflow-hidden transition-colors ${
                  validation.isComplete
                    ? 'border-green-300 bg-green-50/30'
                    : 'border-red-300 bg-red-50/30'
                }`}
              >
                {/* Node header - always visible */}
                <button
                  onClick={() => toggleExpand(state.nodeId)}
                  className={`w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 ${
                    validation.isComplete ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      validation.isComplete ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium text-gray-900">{state.displayName}</span>
                    <span className="text-xs font-mono text-gray-500">{state.nodeId}</span>
                    {isRoot && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">root</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick badges */}
                    {state.metadata.node_type && (
                      <span className={`px-2 py-0.5 text-xs rounded font-mono ${
                        state.metadata.node_type.includes('Root')
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {state.metadata.node_type}
                      </span>
                    )}
                    {state.metadata.kernel_type && state.metadata.kernel_type !== '__other__' && (
                      <span className="px-2 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-mono">
                        {state.metadata.kernel_type.replace('ProbabilityKernel', '')}
                      </span>
                    )}
                    {state.metadata.mechanism_type && state.metadata.mechanism_type !== '__other__' && (
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 font-mono">
                        {state.metadata.mechanism_type.replace('Mechanism', '')}
                      </span>
                    )}
                    {/* Missing fields indicator */}
                    {!validation.isComplete && (
                      <span className="text-xs text-red-600">
                        Missing: {validation.missingFields.join(', ')}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-500 transition-transform ${state.isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded details */}
                {state.isExpanded && (
                  <div className="p-4 space-y-4 border-t border-gray-200 bg-white">
                    <p className="text-sm text-gray-600 italic">{state.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Node Type */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Node Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={state.metadata.node_type || ''}
                          onChange={(e) => updateNodeMetadata(state.nodeId, { node_type: e.target.value as WhyzenMetadata['node_type'] })}
                          className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                            state.metadata.node_type ? 'border-gray-300' : 'border-red-300 bg-red-50'
                          }`}
                        >
                          <option value="">Select...</option>
                          {NODE_TYPES.map(type => (
                            <option key={type.value} value={type.value} title={type.description}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        {NODE_TYPES.find(t => t.value === state.metadata.node_type)?.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {NODE_TYPES.find(t => t.value === state.metadata.node_type)?.description}
                          </p>
                        )}
                      </div>

                      {/* Level */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={state.metadata.level || ''}
                          onChange={(e) => updateNodeMetadata(state.nodeId, { level: e.target.value as WhyzenMetadata['level'] })}
                          className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                            state.metadata.level ? 'border-gray-300' : 'border-red-300 bg-red-50'
                          }`}
                        >
                          <option value="">Select...</option>
                          {LEVELS.map(level => (
                            <option key={level.value} value={level.value} title={level.description}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mechanism Type - only for non-root nodes */}
                      {!isRoot && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Mechanism <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={state.metadata.mechanism_type || ''}
                            onChange={(e) => updateNodeMetadata(state.nodeId, { mechanism_type: e.target.value || null })}
                            className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                              state.metadata.mechanism_type ? 'border-gray-300' : 'border-red-300 bg-red-50'
                            }`}
                          >
                            <option value="">Select...</option>
                            <optgroup label="Core Mechanisms">
                              {MECHANISMS.filter(m => m.category === 'core').map(mech => (
                                <option key={mech.value} value={mech.value} title={mech.description}>
                                  {mech.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Custom">
                              <option value="__other__">Other (specify)...</option>
                            </optgroup>
                          </select>
                          {state.metadata.mechanism_type === '__other__' && (
                            <input
                              type="text"
                              value={state.customMechanism}
                              onChange={(e) => updateCustomField(state.nodeId, 'customMechanism', e.target.value)}
                              placeholder="Enter custom mechanism name..."
                              className="w-full mt-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                            />
                          )}
                          {MECHANISMS.find(m => m.value === state.metadata.mechanism_type)?.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {MECHANISMS.find(m => m.value === state.metadata.mechanism_type)?.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Kernel Type - not required for deterministic nodes */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Kernel (Noise Profile) {!isDeterministic && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          value={state.metadata.kernel_type || ''}
                          onChange={(e) => updateNodeMetadata(state.nodeId, { kernel_type: e.target.value || null })}
                          disabled={isDeterministic}
                          className={`w-full px-3 py-1.5 border rounded-md text-sm ${
                            isDeterministic
                              ? 'border-gray-200 bg-gray-100 text-gray-400'
                              : state.metadata.kernel_type
                                ? 'border-gray-300'
                                : 'border-red-300 bg-red-50'
                          }`}
                        >
                          <option value="">{isDeterministic ? 'N/A (Deterministic)' : 'Select...'}</option>
                          {!isDeterministic && KERNELS.map(kernel => (
                            <option key={kernel.value} value={kernel.value} title={kernel.description}>
                              {kernel.label}
                            </option>
                          ))}
                        </select>
                        {state.metadata.kernel_type === '__other__' && (
                          <input
                            type="text"
                            value={state.customKernel}
                            onChange={(e) => updateCustomField(state.nodeId, 'customKernel', e.target.value)}
                            placeholder="Enter custom kernel name..."
                            className="w-full mt-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          />
                        )}
                        {KERNELS.find(k => k.value === state.metadata.kernel_type)?.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {KERNELS.find(k => k.value === state.metadata.kernel_type)?.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Kernel Params - only show if kernel is selected */}
                    {state.metadata.kernel_type && !isDeterministic && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Kernel Parameters
                          <span className="ml-2 text-gray-400 font-normal">(optional)</span>
                        </label>
                        <div className="space-y-2">
                          {Object.entries(state.metadata.kernel_params).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <input
                                type="text"
                                value={key}
                                readOnly
                                className="w-1/3 px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50"
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => updateKernelParam(state.nodeId, key, e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <button
                                onClick={() => updateKernelParam(state.nodeId, key, '')}
                                className="px-2 text-red-500 hover:text-red-700"
                              >
                                x
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const key = prompt('Parameter name:');
                              if (key) {
                                updateKernelParam(state.nodeId, key, '1.0');
                              }
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            + Add parameter
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {incompleteCount > 0 && (
              <span className="text-xs text-amber-600">
                {incompleteCount} node{incompleteCount !== 1 ? 's' : ''} incomplete (will export with "None")
              </span>
            )}
            <button
              onClick={handleExport}
              className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Whyzen JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyzenExportWizard;
