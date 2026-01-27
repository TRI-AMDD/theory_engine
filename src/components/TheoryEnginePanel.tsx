import type { CausalGraph, NodeClassification, ActionSpace, Hypothesis } from '../types';
import { ActionSpaceEditor } from './ActionSpaceEditor';
import { HypothesisGenerator } from './HypothesisGenerator';
import { HypothesisProposals } from './HypothesisProposals';

interface TheoryEnginePanelProps {
  graph: CausalGraph;
  selectedNodeId: string | null;
  onClassifyNode: (nodeId: string, classification: NodeClassification, isDesirable?: boolean) => void;
  actionSpace: ActionSpace;
  onActionSpaceUpdate: (actionSpace: ActionSpace) => void;
  hypotheses: Hypothesis[];
  onHypothesisGenerated: (hypothesis: Hypothesis) => void;
  onRefreshHypothesis: (hypothesisId: string) => void;
  onDeleteHypothesis: (hypothesisId: string) => void;
  onExportHypothesis: (hypothesis: Hypothesis) => void;
  onRefineHypothesis: (hypothesisId: string, feedback: string) => Promise<void>;
  activeHypothesisId: string | null;
  onHypothesisSelect: (hypothesisId: string | null) => void;
}

export function TheoryEnginePanel({
  graph,
  selectedNodeId,
  onClassifyNode,
  actionSpace,
  onActionSpaceUpdate,
  hypotheses,
  onHypothesisGenerated,
  onRefreshHypothesis,
  onDeleteHypothesis,
  onExportHypothesis,
  onRefineHypothesis,
  activeHypothesisId,
  onHypothesisSelect
}: TheoryEnginePanelProps) {
  const selectedNode = graph.nodes.find(n => n.id === selectedNodeId);
  const nodeNames = graph.nodes.map(n => n.displayName);

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

        {/* Action Space Editor */}
        <div className="p-4 border-b border-gray-200">
          <ActionSpaceEditor
            actionSpace={actionSpace}
            onUpdate={onActionSpaceUpdate}
          />
        </div>

        {/* Hypothesis Generator */}
        <div className="p-4 border-b border-gray-200">
          <HypothesisGenerator
            graph={graph}
            actionSpace={actionSpace}
            onHypothesisGenerated={onHypothesisGenerated}
          />
        </div>

        {/* Hypothesis Proposals */}
        <div className="p-4">
          <HypothesisProposals
            hypotheses={hypotheses}
            graph={graph}
            nodeNames={nodeNames}
            onRefresh={onRefreshHypothesis}
            onDelete={onDeleteHypothesis}
            onExport={onExportHypothesis}
            onRefine={onRefineHypothesis}
            onHypothesisSelect={onHypothesisSelect}
            activeHypothesisId={activeHypothesisId}
          />
        </div>
      </div>
    </div>
  );
}
