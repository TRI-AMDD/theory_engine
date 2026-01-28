import { useState } from 'react';
import type { ConsolidatedActionSet, ConsolidatedAction, Hypothesis, ActionSpace } from '../types';
import { consolidateHypothesisActions } from '../services/api';

interface ActionConsolidationPanelProps {
  hypotheses: Hypothesis[];
  actionSpace: ActionSpace;
  onConsolidated: (actionSet: ConsolidatedActionSet) => void;
  existingActionSet?: ConsolidatedActionSet | null;
}

export function ActionConsolidationPanel({
  hypotheses,
  actionSpace,
  onConsolidated,
  existingActionSet
}: ActionConsolidationPanelProps) {
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [conditioningText, setConditioningText] = useState('');

  const activeHypotheses = hypotheses.filter(h => h.status === 'active');

  // Check if hypotheses have action hooks that match the action space
  const hasMatchingActions = activeHypotheses.some(h =>
    h.actionHooks.some(hook =>
      actionSpace.actions.some(a => a.id === hook.actionId)
    )
  );

  const handleConsolidate = async () => {
    if (activeHypotheses.length < 2) {
      alert('Need at least 2 active hypotheses to consolidate actions');
      return;
    }

    if (actionSpace.actions.length === 0) {
      alert('No actions defined. Add actions in the Action Space Editor above before consolidating.');
      return;
    }

    if (!hasMatchingActions) {
      alert('No hypotheses have action hooks that match defined actions. Try regenerating hypotheses after adding actions.');
      return;
    }

    setIsConsolidating(true);
    try {
      const actionSet = await consolidateHypothesisActions(
        activeHypotheses,
        actionSpace,
        conditioningText || undefined
      );

      if (actionSet.actions.length === 0) {
        alert('No common actions found across hypotheses. Try adding more actions or regenerating hypotheses.');
        return;
      }

      onConsolidated(actionSet);
    } catch (error) {
      console.error('Failed to consolidate actions:', error);
      alert('Failed to consolidate actions. Please try again.');
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">Action Consolidation</h2>

      <p className="text-xs text-gray-500">
        Analyze {activeHypotheses.length} active hypotheses to find shared actions
        and create a unified action plan.
      </p>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Conditioning Text <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={conditioningText}
          onChange={(e) => setConditioningText(e.target.value)}
          placeholder="E.g., 'Focus on high-throughput actions' or 'Prioritize computational over experimental'"
          className="w-full p-2 border border-gray-300 rounded text-sm"
          rows={2}
          disabled={isConsolidating}
        />
      </div>

      {/* Status messages */}
      {actionSpace.actions.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Add actions in the Action Space Editor above before consolidating.
        </p>
      )}

      {actionSpace.actions.length > 0 && !hasMatchingActions && activeHypotheses.length >= 2 && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Hypotheses don't reference defined actions. Regenerate hypotheses after adding actions.
        </p>
      )}

      <button
        onClick={handleConsolidate}
        disabled={isConsolidating || activeHypotheses.length < 2 || actionSpace.actions.length === 0}
        className="w-full py-2 px-4 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isConsolidating ? 'Consolidating...' : 'Consolidate Actions'}
      </button>

      {existingActionSet && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">
            Consolidated Actions ({existingActionSet.actions.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {existingActionSet.actions.map(action => (
              <ConsolidatedActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConsolidatedActionCard({ action }: { action: ConsolidatedAction }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-2 bg-gray-50 rounded border border-gray-200">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{action.actionName}</span>
          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
            {action.utilityScore} hypotheses
          </span>
        </div>
        <span className="text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs">
          <p className="text-gray-600 mb-2">{action.consolidatedInstructions}</p>

          {Object.keys(action.commonParameters).length > 0 && (
            <div className="mb-2">
              <span className="font-medium text-gray-700">Common Parameters:</span>
              <pre className="bg-white p-1 rounded mt-1 overflow-x-auto text-[10px]">
                {JSON.stringify(action.commonParameters, null, 2)}
              </pre>
            </div>
          )}

          <div className="text-gray-500">
            Used by: {action.hypothesisLinks.map(l => l.hypothesisId.slice(-6)).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default ActionConsolidationPanel;
