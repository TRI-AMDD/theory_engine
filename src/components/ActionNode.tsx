import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { ConsolidatedAction } from '../types';

interface ActionNodeData {
  action: ConsolidatedAction;
  label: string;
  isHighlighted: boolean;
}

const actionTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  md_simulation: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-400' },
  experiment: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400' },
  literature: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400' },
  dataset: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
  custom: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-400' },
};

function ActionNodeComponent({ data }: NodeProps) {
  const { action, label, isHighlighted } = data as unknown as ActionNodeData;
  const colors = actionTypeColors[action.actionType] || actionTypeColors.custom;

  return (
    <div
      className={`
        px-3 py-2 rounded-lg border-2 shadow-md min-w-[180px]
        ${isHighlighted
          ? `${colors.bg} ${colors.border} ring-2 ring-pink-400 ring-opacity-50`
          : `${colors.bg} ${colors.border}`
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-pink-500"
      />

      <div className={`font-semibold text-sm ${colors.text}`}>{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] px-1.5 py-0.5 bg-white bg-opacity-60 rounded">
          {action.actionType}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded">
          {action.utilityScore} hyp
        </span>
      </div>
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
export default ActionNode;
