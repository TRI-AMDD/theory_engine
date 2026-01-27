import { useState } from 'react';
import type { Hypothesis, CausalGraph } from '../types';

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  graph: CausalGraph;
  onRefresh: (hypothesisId: string) => void;
  onDelete: (hypothesisId: string) => void;
  onExport: (hypothesis: Hypothesis) => void;
}

export function HypothesisCard({
  hypothesis,
  graph,
  onRefresh,
  onDelete,
  onExport
}: HypothesisCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getNodeName = (id: string) =>
    graph.nodes.find(n => n.id === id)?.displayName || 'Unknown';

  const isOutdated = hypothesis.status === 'outdated';

  return (
    <div className={`rounded border ${
      isOutdated ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isOutdated && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">
                  Outdated
                </span>
              )}
              <span className="text-xs text-gray-400">
                {new Date(hypothesis.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">
              {hypothesis.prescription}
            </p>
          </div>
          <span className="text-gray-400 text-sm ml-2">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
          {/* Node references */}
          <div className="pt-3 space-y-1 text-xs">
            <div>
              <span className="text-blue-600 font-medium">Intervenables:</span>{' '}
              {hypothesis.intervenables.map(getNodeName).join(', ') || 'None'}
            </div>
            <div>
              <span className="text-green-600 font-medium">Observables:</span>{' '}
              {hypothesis.observables.map(getNodeName).join(', ')}
            </div>
            <div>
              <span className="text-yellow-600 font-medium">Desirables:</span>{' '}
              {hypothesis.desirables.map(getNodeName).join(', ') || 'None'}
            </div>
          </div>

          {/* Predictions */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-600">Observable Predictions:</span>
              <p className="text-sm text-gray-700">{hypothesis.predictions.observables}</p>
            </div>
            {hypothesis.predictions.desirables && (
              <div>
                <span className="text-xs font-medium text-gray-600">Desirable Predictions:</span>
                <p className="text-sm text-gray-700">{hypothesis.predictions.desirables}</p>
              </div>
            )}
          </div>

          {/* Story */}
          <div>
            <span className="text-xs font-medium text-gray-600">Causal Story:</span>
            <p className="text-sm text-gray-700 italic">{hypothesis.story}</p>
          </div>

          {/* Action Hooks */}
          {hypothesis.actionHooks.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600">Validation Actions:</span>
              <div className="mt-1 space-y-2">
                {hypothesis.actionHooks.map((hook, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="font-medium text-gray-700">{hook.actionName}</div>
                    {Object.entries(hook.parameters).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(hook.parameters).map(([k, v]) => (
                          <span key={k} className="px-1 bg-blue-100 text-blue-700 rounded">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-gray-600">{hook.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critique */}
          <div>
            <span className="text-xs font-medium text-gray-600">Critique:</span>
            <p className="text-sm text-red-700">{hypothesis.critique}</p>
          </div>

          {/* Outdated reason */}
          {isOutdated && hypothesis.outdatedReason && (
            <p className="text-xs text-amber-700">
              Outdated because: {hypothesis.outdatedReason}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {isOutdated && (
              <button
                onClick={() => onRefresh(hypothesis.id)}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Refresh
              </button>
            )}
            <button
              onClick={() => onExport(hypothesis)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Export Instructions
            </button>
            <button
              onClick={() => onDelete(hypothesis.id)}
              className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
