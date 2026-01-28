import type { ActionModification, Hypothesis } from '../types';

interface ModificationConfirmModalProps {
  modification: ActionModification;
  hypotheses: Hypothesis[];
  onConfirm: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function ModificationConfirmModal({
  modification,
  hypotheses,
  onConfirm,
  onReject,
  onClose
}: ModificationConfirmModalProps) {
  const affectedHypotheses = hypotheses.filter(h =>
    modification.affectedHypothesisIds.includes(h.id)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Confirm Action Modification</h2>
          <p className="text-sm text-gray-500 mt-1">
            This will update the action parameters and may affect linked hypotheses.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Parameter Changes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Parameter Changes</h3>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {Object.keys(modification.proposedParameters).length > 0 ? (
                Object.entries(modification.proposedParameters).map(([key, newValue]) => {
                  const oldValue = modification.originalParameters[key];
                  const changed = oldValue !== newValue;
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-600 w-24">{key}:</span>
                      {changed ? (
                        <>
                          <span className="line-through text-red-500">{oldValue || '(empty)'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-green-600 font-medium">{newValue}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">{newValue} (unchanged)</span>
                      )}
                    </div>
                  );
                })
              ) : (
                <span className="text-gray-400 text-sm">No parameters</span>
              )}
            </div>
          </div>

          {/* Instruction Changes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Instruction Changes</h3>
            {modification.originalInstructions !== modification.proposedInstructions ? (
              <div className="space-y-2">
                <div className="bg-red-50 p-2 rounded">
                  <span className="text-xs text-red-500 font-medium">Before:</span>
                  <p className="text-sm text-red-700 mt-1">{modification.originalInstructions}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <span className="text-xs text-green-500 font-medium">After:</span>
                  <p className="text-sm text-green-700 mt-1">{modification.proposedInstructions}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">No changes to instructions</p>
            )}
          </div>

          {/* Affected Hypotheses */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Affected Hypotheses ({affectedHypotheses.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {affectedHypotheses.map(hyp => (
                <div key={hyp.id} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  <div className="text-yellow-800 line-clamp-2">{hyp.prescription}</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Will be updated with new action parameters
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rationale */}
          {modification.rationale && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Rationale</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{modification.rationale}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={onReject}
            className="px-4 py-2 text-red-600 text-sm font-medium hover:text-red-800"
          >
            Reject
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModificationConfirmModal;
