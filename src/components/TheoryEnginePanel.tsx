import type { CausalGraph, NodeClassification, ActionSpace, Hypothesis, ConsolidatedActionSet } from '../types';
import { ActionSpaceEditor } from './ActionSpaceEditor';
import { HypothesisGenerator } from './HypothesisGenerator';
import { HypothesisProposals } from './HypothesisProposals';
import { ActionConsolidationPanel } from './ActionConsolidationPanel';
import { QuickClassifyPanel } from './QuickClassifyPanel';

interface TheoryEnginePanelProps {
  graph: CausalGraph;
  onClassifyNode: (nodeId: string, classification: NodeClassification, isDesirable?: boolean) => void;
  actionSpace: ActionSpace;
  onActionSpaceUpdate: (actionSpace: ActionSpace) => void;
  hypotheses: Hypothesis[];
  onGenerateHypotheses: (hint: string, count: number) => void;
  isGeneratingHypothesis: boolean;
  generationProgress: { current: number; total: number } | null;
  onRefreshHypothesis: (hypothesisId: string) => void;
  onDeleteHypothesis: (hypothesisId: string) => void;
  onExportHypothesis: (hypothesis: Hypothesis) => void;
  onRefineHypothesis: (hypothesisId: string, feedback: string) => Promise<void>;
  activeHypothesisId: string | null;
  onHypothesisSelect: (hypothesisId: string | null) => void;
  consolidatedActionSet: ConsolidatedActionSet | null;
  onConsolidatedActionSet: (actionSet: ConsolidatedActionSet) => void;
}

export function TheoryEnginePanel({
  graph,
  onClassifyNode,
  actionSpace,
  onActionSpaceUpdate,
  hypotheses,
  onGenerateHypotheses,
  isGeneratingHypothesis,
  generationProgress,
  onRefreshHypothesis,
  onDeleteHypothesis,
  onExportHypothesis,
  onRefineHypothesis,
  activeHypothesisId,
  onHypothesisSelect,
  consolidatedActionSet,
  onConsolidatedActionSet
}: TheoryEnginePanelProps) {
  const nodeNames = graph.nodes.map(n => n.displayName);

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-xl font-bold text-gray-900">Theory Engine</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Quick Classify Panel */}
        <div className="p-4 border-b border-gray-200">
          <QuickClassifyPanel
            nodes={graph.nodes}
            onClassifyNode={onClassifyNode}
          />
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
            onGenerate={onGenerateHypotheses}
            isGenerating={isGeneratingHypothesis}
          />

          {/* Generation Progress */}
          {generationProgress && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
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
        </div>

        {/* Hypothesis Proposals */}
        <div className="p-4 border-b border-gray-200">
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

        {/* Action Consolidation - only show with 2+ hypotheses */}
        {hypotheses.filter(h => h.status === 'active').length >= 2 && (
          <div className="p-4">
            <ActionConsolidationPanel
              hypotheses={hypotheses}
              actionSpace={actionSpace}
              onConsolidated={onConsolidatedActionSet}
              existingActionSet={consolidatedActionSet}
            />
          </div>
        )}
      </div>
    </div>
  );
}
