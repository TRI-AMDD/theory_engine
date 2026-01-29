import { useState } from 'react';
import type { CausalGraph, ActionSpace } from '../types';

interface HypothesisGeneratorProps {
  graph: CausalGraph;
  actionSpace: ActionSpace;
  onGenerate: (hint: string, count: number) => void;
  isGenerating?: boolean;
}

export function HypothesisGenerator({
  graph,
  actionSpace,
  onGenerate,
  isGenerating = false
}: HypothesisGeneratorProps) {
  const [conditioningHint, setConditioningHint] = useState('');
  const [hypothesisCount, setHypothesisCount] = useState<number>(1);

  const intervenables = graph.nodes.filter(n => n.classification === 'intervenable');
  const observables = graph.nodes.filter(n => n.classification === 'observable');
  const desirables = graph.nodes.filter(n => n.isDesirable);

  const canGenerate = observables.length > 0;

  const handleGenerate = () => {
    if (!canGenerate) return;
    onGenerate(conditioningHint.trim(), hypothesisCount);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Hypothesis Generation</h2>

      {/* Summary of classified nodes */}
      <div className="text-xs space-y-1">
        <div className="text-gray-500 font-medium mb-1">Based on:</div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-medium">▲ I:</span>
          <span className={intervenables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {intervenables.length > 0
              ? intervenables.map(n => n.displayName).join(', ')
              : 'None selected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-medium">● O:</span>
          <span className={observables.length > 0 ? 'text-gray-700' : 'text-red-400'}>
            {observables.length > 0
              ? observables.map(n => n.displayName).join(', ')
              : 'Required - select at least one'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 font-medium">★ D:</span>
          <span className={desirables.length > 0 ? 'text-gray-700' : 'text-gray-400'}>
            {desirables.length > 0
              ? desirables.map(n => n.displayName).join(', ')
              : 'None selected (optional)'}
          </span>
        </div>
      </div>

      {/* Number of hypotheses */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Number of Hypotheses
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max="10"
            value={hypothesisCount}
            onChange={(e) => setHypothesisCount(parseInt(e.target.value))}
            className="flex-1"
            disabled={isGenerating}
          />
          <span className="text-sm font-mono w-6 text-center">{hypothesisCount}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          More hypotheses = more diverse perspectives, but longer generation time
        </p>
      </div>

      {/* Conditioning hint */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Guidance <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={conditioningHint}
          onChange={e => setConditioningHint(e.target.value)}
          placeholder="e.g., 'Focus on temperature effects' or 'Generate a hypothesis about catalyst performance' or 'What happens if we increase pressure?'"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
          rows={2}
          disabled={isGenerating}
        />
      </div>

      {/* Action space check */}
      {actionSpace.actions.length === 0 && (
        <p className="text-xs text-amber-600">
          No actions defined. Hypotheses will be generated without validation hooks.
        </p>
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
