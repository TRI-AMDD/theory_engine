import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps, Node } from '@xyflow/react';

interface ClassifiedNodeData extends Record<string, unknown> {
  label: string;
  classification?: 'intervenable' | 'observable' | 'desirable' | null;
  isDesirable?: boolean;
  isSelected?: boolean;
  relationshipColor?: string;
}

type ClassifiedNodeType = Node<ClassifiedNodeData, 'classified'>;

function ClassifiedNode({ data }: NodeProps<ClassifiedNodeType>) {
  const { label, classification, isDesirable, isSelected, relationshipColor } = data;

  const isObservableAndDesirable = classification === 'observable' && isDesirable;

  const getShapeStyles = (): React.CSSProperties => {
    const baseColor = relationshipColor || (isSelected ? '#fbbf24' : '#ffffff');

    if (classification === 'intervenable') {
      return {
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
        backgroundColor: baseColor,
        border: '2px solid #374151',
      };
    }

    if (isObservableAndDesirable) {
      return {
        backgroundColor: '#fcd34d',
        border: '3px solid #b45309',
        borderRadius: '0',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      };
    }

    if (isDesirable || classification === 'desirable') {
      return {
        backgroundColor: baseColor,
        border: '2px solid #374151',
        clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      };
    }

    if (classification === 'observable') {
      return {
        backgroundColor: baseColor,
        border: '2px solid #374151',
        borderRadius: '50%',
      };
    }

    return {
      backgroundColor: baseColor,
      border: '2px solid #374151',
      borderRadius: '4px',
    };
  };

  return (
    <div
      className="px-4 py-2 min-w-[80px] min-h-[40px] flex items-center justify-center text-center"
      style={getShapeStyles()}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
        {label}
      </span>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}

export default memo(ClassifiedNode);
