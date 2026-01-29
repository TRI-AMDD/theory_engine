import { useState } from 'react';
import type { ConsolidatedAction, Hypothesis } from '../types';
import {
  exportActionToJson,
  exportActionToMarkdown,
  downloadAsFile
} from '../utils/actionExport';

interface ActionDetailPanelProps {
  action: ConsolidatedAction;
  hypotheses: Hypothesis[];
  onClose: () => void;
  onProposeModification: (actionId: string, proposedParams: Record<string, string>, proposedInstructions: string) => void;
  onLlmRefine?: (actionId: string, feedback: string) => Promise<void>;
}

export function ActionDetailPanel({
  action,
  hypotheses,
  onClose,
  onProposeModification,
  onLlmRefine
}: ActionDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedParams, setEditedParams] = useState<Record<string, string>>(action.commonParameters);
  const [editedInstructions, setEditedInstructions] = useState(action.consolidatedInstructions);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const handleExportJson = () => {
    const exported = exportActionToJson(action, hypotheses);
    downloadAsFile(
      JSON.stringify(exported, null, 2),
      `action-${action.actionName.toLowerCase().replace(/\s+/g, '-')}.json`,
      'application/json'
    );
  };

  const handleExportMarkdown = () => {
    const markdown = exportActionToMarkdown(action, hypotheses);
    downloadAsFile(
      markdown,
      `action-${action.actionName.toLowerCase().replace(/\s+/g, '-')}.md`,
      'text/markdown'
    );
  };

  const handleProposeChanges = () => {
    onProposeModification(action.id, editedParams, editedInstructions);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedParams(action.commonParameters);
    setEditedInstructions(action.consolidatedInstructions);
    setIsEditing(false);
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h2 className="font-semibold text-gray-900">{action.actionName}</h2>
          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">{action.actionType}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h3>
          <p className="text-sm text-gray-700">{action.description}</p>
        </div>

        {/* Utility Score */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Utility Score</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${Math.min(action.utilityScore * 20, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-purple-700">{action.utilityScore} hypotheses</span>
          </div>
        </div>

        {/* Parameters */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Common Parameters</h3>
          {isEditing ? (
            <div className="space-y-2">
              {Object.entries(editedParams).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <label className="text-xs text-gray-600 w-24">{key}:</label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setEditedParams(prev => ({ ...prev, [key]: e.target.value }))}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-2 rounded text-xs font-mono">
              {Object.keys(action.commonParameters).length > 0 ? (
                Object.entries(action.commonParameters).map(([key, value]) => (
                  <div key={key}><span className="text-gray-500">{key}:</span> {value}</div>
                ))
              ) : (
                <span className="text-gray-400">No common parameters</span>
              )}
            </div>
          )}
        </div>

        {/* Consolidated Instructions */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Consolidated Instructions</h3>
          {isEditing ? (
            <textarea
              value={editedInstructions}
              onChange={(e) => setEditedInstructions(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded"
              rows={4}
            />
          ) : (
            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{action.consolidatedInstructions}</p>
          )}
        </div>

        {/* Linked Hypotheses */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Linked Hypotheses ({action.hypothesisLinks.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {action.hypothesisLinks.map(link => {
              const hyp = hypotheses.find(h => h.id === link.hypothesisId);
              return (
                <div key={link.hypothesisId} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="font-medium text-gray-800 line-clamp-2">
                    {hyp?.prescription || 'Unknown hypothesis'}
                  </div>
                  <div className="text-gray-500 mt-1">
                    Params: {JSON.stringify(link.parameters)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleProposeChanges}
              className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              Propose Changes
            </button>
            <button
              onClick={handleCancelEdit}
              className="flex-1 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleExportJson}
                className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Export JSON
              </button>
              <button
                onClick={handleExportMarkdown}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700"
              >
                Export MD
              </button>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 bg-yellow-500 text-white text-sm font-medium rounded hover:bg-yellow-600"
            >
              Propose Modification
            </button>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <label className="text-xs font-medium text-gray-600">Ask AI to refine:</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  placeholder="e.g., 'Use higher temperature range'"
                  className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded"
                  disabled={isRefining}
                />
                <button
                  onClick={async () => {
                    if (!feedbackInput.trim() || !onLlmRefine) return;
                    setIsRefining(true);
                    try {
                      await onLlmRefine(action.id, feedbackInput);
                      setFeedbackInput('');
                    } finally {
                      setIsRefining(false);
                    }
                  }}
                  disabled={!feedbackInput.trim() || isRefining || !onLlmRefine}
                  className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {isRefining ? '...' : 'Refine'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ActionDetailPanel;
