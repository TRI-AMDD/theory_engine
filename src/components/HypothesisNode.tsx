import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Hypothesis } from '../types';

interface HypothesisNodeData {
  hypothesis: Hypothesis;
  label: string;
  isHighlighted: boolean;
}

function HypothesisNodeComponent({ data }: NodeProps) {
  const { hypothesis, label, isHighlighted } = data as unknown as HypothesisNodeData;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        ${isHighlighted
          ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-400 ring-opacity-50'
          : 'bg-white border-gray-300'
        }
      `}
    >
      <div className="font-semibold text-sm text-gray-800 mb-1">{label}</div>
      <div className="text-xs text-gray-600 line-clamp-2">
        {hypothesis.prescription}
      </div>
      <div className="flex gap-1 mt-2">
        <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded">
          {hypothesis.actionHooks.length} actions
        </span>
        <span className={`text-[10px] px-1 py-0.5 rounded ${
          hypothesis.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {hypothesis.status}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </div>
  );
}

export const HypothesisNode = memo(HypothesisNodeComponent);
export default HypothesisNode;
