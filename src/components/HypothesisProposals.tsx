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
