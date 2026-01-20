import React, { useState, useMemo } from 'react';
import type { CausalGraph } from '../types';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  graph: CausalGraph;
  onAddNode: (nodeData: { displayName: string; variableName: string; description: string }, parentIds: string[], childIds: string[]) => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  onClose,
  graph,
  onAddNode,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedParents, setSelectedParents] = useState<Set<string>>(new Set());
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());

  // Sort nodes alphabetically by display name
  const sortedNodes = useMemo(() => {
    return [...graph.nodes].sort((a, b) =>
      a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
    );
  }, [graph.nodes]);

  const handleClose = () => {
    // Reset state when closing
    setDisplayName('');
    setDescription('');
    setSelectedParents(new Set());
    setSelectedChildren(new Set());
    onClose();
  };

  const handleToggleParent = (nodeId: string) => {
    setSelectedParents(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // Remove from children if it was there (can't be both)
        setSelectedChildren(c => {
          const nextC = new Set(c);
          nextC.delete(nodeId);
          return nextC;
        });
      }
      return next;
    });
  };

  const handleToggleChild = (nodeId: string) => {
    setSelectedChildren(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // Remove from parents if it was there (can't be both)
        setSelectedParents(p => {
          const nextP = new Set(p);
          nextP.delete(nodeId);
          return nextP;
        });
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (!displayName.trim()) return;

    // Generate a snake_case variable name from the display name
    const variableName = displayName.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');

    onAddNode(
      { displayName: displayName.trim(), variableName, description: description.trim() },
      Array.from(selectedParents),
      Array.from(selectedChildren)
    );
    handleClose();
  };

  const isValid = displayName.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50">
          <div>
            <h2 className="text-lg font-semibold text-emerald-900">Add New Node</h2>
            <p className="text-sm text-emerald-600">Create a new variable and define its relationships</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Node Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Temperature, Growth Rate, pH Level"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this variable represents in your experiment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Relationships */}
          {sortedNodes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Define Relationships
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select how existing nodes relate to your new node.
                <span className="text-blue-600 font-medium"> Parent</span> = causes your new node.
                <span className="text-red-600 font-medium"> Child</span> = is caused by your new node.
              </p>

              {/* Selected connections summary */}
              {(selectedParents.size > 0 || selectedChildren.size > 0) && (
                <div className="mb-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="text-xs font-medium text-gray-600 mb-2">Selected Connections:</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedParents).map(id => {
                      const node = graph.nodes.find(n => n.id === id);
                      return (
                        <span
                          key={`parent-${id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                          {node?.displayName || id}
                          <button
                            onClick={() => handleToggleParent(id)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {Array.from(selectedChildren).map(id => {
                      const node = graph.nodes.find(n => n.id === id);
                      return (
                        <span
                          key={`child-${id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                          {node?.displayName || id}
                          <button
                            onClick={() => handleToggleChild(id)}
                            className="ml-1 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Node list */}
              <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-64 overflow-y-auto">
                {sortedNodes.map(node => {
                  const isParent = selectedParents.has(node.id);
                  const isChild = selectedChildren.has(node.id);

                  return (
                    <div
                      key={node.id}
                      className={`px-4 py-3 flex items-center justify-between ${
                        isParent ? 'bg-blue-50' : isChild ? 'bg-red-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {node.displayName}
                        </div>
                        {node.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {node.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleParent(node.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            isParent
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                          title={`${node.displayName} causes the new node`}
                        >
                          Parent
                        </button>
                        <button
                          onClick={() => handleToggleChild(node.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            isChild
                              ? 'bg-red-600 text-white'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={`The new node causes ${node.displayName}`}
                        >
                          Child
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sortedNodes.length === 0 && (
            <div className="text-sm text-gray-500 italic">
              No existing nodes in the graph. The new node will be added without any connections.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 text-sm font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-6 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Node
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddNodeModal;
