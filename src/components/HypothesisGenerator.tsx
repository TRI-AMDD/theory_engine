import { useState } from 'react';
import type { CausalGraph, ActionSpace, Hypothesis } from '../types';
import { generateHypothesis } from '../services/api';

interface HypothesisGeneratorProps {
  graph: CausalGraph;
  actionSpace: ActionSpace;
  onHypothesisGenerated: (hypothesis: Hypothesis) => void;
}

export function HypothesisGenerator({
  graph,
  actionSpace,
  onHypothesisGenerated
}: HypothesisGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervenables = graph.nodes.filter(n => n.classification === 'intervenable');
  const observables = graph.nodes.filter(n => n.classification === 'observable');
  const desirables = graph.nodes.filter(n => n.isDesirable);

  const canGenerate = observables.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateHypothesis({
        experimentalContext: graph.experimentalContext,
        graph,
        intervenables,
        observables,
        desirables,
        actionSpace,
      });

      const hypothesis: Hypothesis = {
        id: `hyp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        intervenables: intervenables.map(n => n.id),
        observables: observables.map(n => n.id),
        desirables: desirables.map(n => n.id),
        prescription: result.prescription,
        predictions: result.predictions,
        story: result.story,
        actionHooks: result.actionHooks.map(hook => ({
          ...hook,
          actionName: actionSpace.actions.find(a => a.id === hook.actionId)?.name || 'Unknown',
        })),
        critique: result.critique,
        status: 'active',
      };

      onHypothesisGenerated(hypothesis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate hypothesis');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Hypothesis Generation</h2>

      {/* Summary of selected nodes */}
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">▲ I:</span>
          <span className={intervenables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {intervenables.length > 0
              ? intervenables.map(n => n.displayName).join(', ')
              : 'None selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600">● O:</span>
          <span className={observables.length > 0 ? 'text-gray-700' : 'text-red-400'}>
            {observables.length > 0
              ? observables.map(n => n.displayName).join(', ')
              : 'Required - select at least one'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-600">★ D:</span>
          <span className={desirables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {desirables.length > 0
              ? desirables.map(n => n.displayName).join(', ')
              : 'None selected (optional)'}
          </span>
        </div>
      </div>

      {/* Action space check */}
      {actionSpace.actions.length === 0 && (
        <p className="text-xs text-amber-600">
          No actions defined. Hypotheses will be generated without validation hooks.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className={`w-full py-2 px-4 rounded text-sm font-medium ${
          canGenerate && !isGenerating
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isGenerating ? 'Generating...' : 'Generate Hypothesis'}
      </button>
    </div>
  );
}
