import { useState } from 'react';
import type { ActionSpace, ActionDefinition } from '../types';

interface ActionSpaceEditorProps {
  actionSpace: ActionSpace;
  onUpdate: (actionSpace: ActionSpace) => void;
}

const ACTION_TYPES = [
  {
    value: 'md_simulation',
    label: 'MD Simulation',
    defaultHints: [
      'structure',           // DB reference + modifications (e.g., "MP:mp-149 + supercell(2x2x2)")
      'temperature',         // Target temperature (K)
      'simulation_time',     // Duration (ps/ns)
      'ensemble',            // NVE/NVT/NPT
      'force_field',         // ReaxFF/MLP/EAM/etc. or xc_functional for AIMD/DFT
    ]
  },
  { value: 'experiment', label: 'Experiment', defaultHints: ['method', 'conditions', 'samples'] },
  { value: 'literature', label: 'Literature Search', defaultHints: ['keywords', 'databases'] },
  { value: 'dataset', label: 'Dataset Query', defaultHints: ['dataset_name', 'query_type'] },
  { value: 'custom', label: 'Custom', defaultHints: [] },
] as const;

export function ActionSpaceEditor({ actionSpace, onUpdate }: ActionSpaceEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ActionDefinition['type']>('custom');
  const [newDescription, setNewDescription] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;

    const typeConfig = ACTION_TYPES.find(t => t.value === newType);
    const newAction: ActionDefinition = {
      id: `action-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      description: newDescription.trim(),
      parameterHints: typeConfig?.defaultHints ? [...typeConfig.defaultHints] : [],
    };

    onUpdate({
      actions: [...actionSpace.actions, newAction],
    });

    setNewName('');
    setNewDescription('');
    setIsAdding(false);
  };

  const handleRemove = (actionId: string) => {
    onUpdate({
      actions: actionSpace.actions.filter(a => a.id !== actionId),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Action Space</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          + Add Action
        </button>
      </div>

      {actionSpace.actions.length === 0 && !isAdding && (
        <p className="text-xs text-gray-400">No actions defined. Add actions to enable hypothesis validation.</p>
      )}

      {actionSpace.actions.map(action => (
        <div key={action.id} className="bg-white rounded border border-gray-200 p-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-sm font-medium text-gray-800">{action.name}</span>
              <span className="ml-2 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {ACTION_TYPES.find(t => t.value === action.type)?.label}
              </span>
            </div>
            <button
              onClick={() => handleRemove(action.id)}
              className="text-gray-400 hover:text-red-500 text-xs"
            >
              ×
            </button>
          </div>
          {action.description && (
            <p className="text-xs text-gray-500 mt-1">{action.description}</p>
          )}
          {action.parameterHints && action.parameterHints.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {action.parameterHints.map(hint => (
                <span key={hint} className="text-xs px-1 bg-blue-50 text-blue-600 rounded">
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {isAdding && (
        <div className="bg-blue-50 rounded border border-blue-200 p-3 space-y-2">
          <input
            type="text"
            placeholder="Action name (e.g., 'Matlantis MD Run')"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as ActionDefinition['type'])}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          >
            {ACTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
