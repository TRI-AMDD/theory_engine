import { useState, useMemo } from 'react';
import type { Hypothesis, CausalGraph } from '../types';
import { highlightNodeNames, buildNodeHighlightInfo } from '../utils/textHighlight';

interface HypothesisCardProps {
  hypothesis: Hypothesis;
  graph: CausalGraph;
  nodeNames: string[];
  onRefresh: (hypothesisId: string) => void;
  onDelete: (hypothesisId: string) => void;
  onExport: (hypothesis: Hypothesis) => void;
  onRefine: (hypothesisId: string, feedback: string) => Promise<void>;
  onSelect?: (hypothesisId: string | null) => void;
  isActive?: boolean;
  onDirectEdit?: (hypothesisId: string, updates: Partial<Hypothesis>) => void;
}

export function HypothesisCard({
  hypothesis,
  graph,
  nodeNames,
  onRefresh,
  onDelete,
  onExport,
  onRefine,
  onSelect,
  isActive,
  onDirectEdit
}: HypothesisCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  // Inline editing state for prescription
  const [isEditingPrescription, setIsEditingPrescription] = useState(false);
  const [editedPrescription, setEditedPrescription] = useState(hypothesis.prescription);

  // Inline editing state for predictions
  const [isEditingPredictions, setIsEditingPredictions] = useState(false);
  const [editedObsPrediction, setEditedObsPrediction] = useState(hypothesis.predictions.observables);
  const [editedDesPrediction, setEditedDesPrediction] = useState(hypothesis.predictions.desirables);

  // Inline editing state for action hooks
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);

  const getNodeName = (id: string) =>
    graph.nodes.find(n => n.id === id)?.displayName || 'Unknown';

  // Build highlight info with classification data
  const nodeHighlightInfo = useMemo(
    () => buildNodeHighlightInfo(graph.nodes),
    [graph.nodes]
  );

  const highlight = (text: string) => highlightNodeNames(text, nodeNames, nodeHighlightInfo);

  const isOutdated = hypothesis.status === 'outdated';

  return (
    <div className={`rounded border ${
      isActive
        ? 'border-blue-400 border-l-4 bg-blue-50'
        : isOutdated ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => {
          const newExpanded = !expanded;
          setExpanded(newExpanded);
          onSelect?.(newExpanded ? hypothesis.id : null);
        }}
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
            <p className={`text-sm font-medium text-gray-800 mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
              {highlight(hypothesis.prescription)}
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
          {/* Prescription (editable) */}
          <div className="pt-3">
            <span className="text-xs font-medium text-gray-600">Prescription:</span>
            {isEditingPrescription ? (
              <div className="mt-1">
                <textarea
                  value={editedPrescription}
                  onChange={(e) => setEditedPrescription(e.target.value)}
                  className="w-full text-sm p-2 border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      onDirectEdit?.(hypothesis.id, { prescription: editedPrescription });
                      setIsEditingPrescription(false);
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditedPrescription(hypothesis.prescription);
                      setIsEditingPrescription(false);
                    }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-gray-800 mt-1 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDirectEdit) {
                    setIsEditingPrescription(true);
                  }
                }}
                title={onDirectEdit ? 'Click to edit' : undefined}
              >
                {highlight(hypothesis.prescription)}
              </p>
            )}
          </div>

          {/* Node references */}
          <div className="space-y-1 text-xs">
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

          {/* Predictions (editable) */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-600">Observable Predictions:</span>
              {isEditingPredictions ? (
                <div className="mt-1 space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Observable:</label>
                    <textarea
                      value={editedObsPrediction}
                      onChange={(e) => setEditedObsPrediction(e.target.value)}
                      className="w-full text-sm p-2 border border-green-300 rounded-md focus:ring-1 focus:ring-green-500 focus:border-green-500 resize-y"
                      rows={2}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Desirable:</label>
                    <textarea
                      value={editedDesPrediction}
                      onChange={(e) => setEditedDesPrediction(e.target.value)}
                      className="w-full text-sm p-2 border border-yellow-300 rounded-md focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 resize-y"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDirectEdit?.(hypothesis.id, {
                          predictions: {
                            observables: editedObsPrediction,
                            desirables: editedDesPrediction
                          }
                        });
                        setIsEditingPredictions(false);
                      }}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditedObsPrediction(hypothesis.predictions.observables);
                        setEditedDesPrediction(hypothesis.predictions.desirables);
                        setIsEditingPredictions(false);
                      }}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p
                    className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onDirectEdit) {
                        setIsEditingPredictions(true);
                      }
                    }}
                    title={onDirectEdit ? 'Click to edit predictions' : undefined}
                  >
                    {highlight(hypothesis.predictions.observables)}
                  </p>
                  {hypothesis.predictions.desirables && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-600">Desirable Predictions:</span>
                      <p
                        className="text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDirectEdit) {
                            setIsEditingPredictions(true);
                          }
                        }}
                        title={onDirectEdit ? 'Click to edit predictions' : undefined}
                      >
                        {highlight(hypothesis.predictions.desirables)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Story */}
          <div>
            <span className="text-xs font-medium text-gray-600">Causal Story:</span>
            <p className="text-sm text-gray-700 italic">{highlight(hypothesis.story)}</p>
          </div>

          {/* Action Hooks */}
          {hypothesis.actionHooks.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-600">Validation Actions:</span>
              <div className="mt-1 space-y-2">
                {hypothesis.actionHooks.map((hook, i) => (
                  <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-700">{hook.actionName}</div>
                      {onDirectEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingActionIndex(editingActionIndex === i ? null : i);
                          }}
                          className="text-xs px-1.5 py-0.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          {editingActionIndex === i ? 'Done' : 'Edit'}
                        </button>
                      )}
                    </div>
                    {editingActionIndex === i ? (
                      <div className="mt-2 space-y-2">
                        {/* Editable parameters */}
                        {Object.entries(hook.parameters).map(([k, v]) => (
                          <div key={k} className="flex gap-2 items-center">
                            <label className="w-24 text-gray-600">{k}:</label>
                            <input
                              type="text"
                              value={v}
                              onChange={(e) => {
                                const newHooks = [...hypothesis.actionHooks];
                                newHooks[i] = {
                                  ...newHooks[i],
                                  parameters: { ...newHooks[i].parameters, [k]: e.target.value }
                                };
                                onDirectEdit?.(hypothesis.id, { actionHooks: newHooks });
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                        ))}
                        {/* Editable instructions */}
                        <div>
                          <label className="text-gray-600">Instructions:</label>
                          <textarea
                            value={hook.instructions}
                            onChange={(e) => {
                              const newHooks = [...hypothesis.actionHooks];
                              newHooks[i] = { ...newHooks[i], instructions: e.target.value };
                              onDirectEdit?.(hypothesis.id, { actionHooks: newHooks });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critique */}
          <div>
            <span className="text-xs font-medium text-gray-600">Critique:</span>
            <p className="text-sm text-red-700">{highlight(hypothesis.critique)}</p>
          </div>

          {/* Outdated reason */}
          {isOutdated && hypothesis.outdatedReason && (
            <p className="text-xs text-amber-700">
              Outdated because: {hypothesis.outdatedReason}
            </p>
          )}

          {/* Follow-up / Refinement */}
          <div className="pt-2 border-t border-gray-100">
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Ask a question or suggest changes:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={feedbackInput}
                onChange={e => setFeedbackInput(e.target.value)}
                placeholder="e.g., 'What if we increase temperature?' or 'Focus more on the catalyst'"
                className="flex-1 text-sm px-2 py-1 border border-gray-300 rounded"
                disabled={isRefining}
              />
              <button
                onClick={async () => {
                  if (!feedbackInput.trim()) return;
                  setIsRefining(true);
                  setRefineError(null);
                  try {
                    await onRefine(hypothesis.id, feedbackInput);
                    setFeedbackInput('');
                  } catch (err) {
                    setRefineError(err instanceof Error ? err.message : 'Refinement failed');
                  } finally {
                    setIsRefining(false);
                  }
                }}
                disabled={!feedbackInput.trim() || isRefining}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isRefining ? '...' : 'Refine'}
              </button>
            </div>
            {refineError && <p className="text-xs text-red-600 mt-1">{refineError}</p>}
          </div>

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
