import React, { useState } from 'react';

interface ContextHeaderProps {
  context: string;
  onContextChange?: (newContext: string) => void;
}

export const ContextHeader: React.FC<ContextHeaderProps> = ({ context, onContextChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(context);

  const firstLine = context.split('\n')[0];
  const truncatedText =
    firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine + '...';

  const handleSave = () => {
    if (onContextChange) {
      onContextChange(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(context);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-gray-900">Edit Experiment Context</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full h-32 p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-start">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 px-6 py-4 flex items-start gap-3 text-left hover:bg-gray-50 transition-colors duration-150"
        >
          <svg
            className={`flex-shrink-0 w-5 h-5 text-gray-500 transform transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-gray-900 mb-1">
              Experiment Context
            </h2>
            {isExpanded ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {context}
              </p>
            ) : (
              <p className="text-sm text-gray-500 truncate">{truncatedText}</p>
            )}
          </div>
        </button>
        {onContextChange && (
          <button
            onClick={() => {
              setEditValue(context);
              setIsEditing(true);
            }}
            className="px-4 py-4 text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit context"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ContextHeader;
