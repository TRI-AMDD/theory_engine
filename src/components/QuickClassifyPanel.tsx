import { useState } from 'react';
import type { CausalNode } from '../types';

type NodeClassification = 'intervenable' | 'observable' | 'desirable' | null;

interface QuickClassifyPanelProps {
  nodes: CausalNode[];
  onClassifyNode: (nodeId: string, classification: NodeClassification, isDesirable?: boolean) => void;
}

export function QuickClassifyPanel({ nodes, onClassifyNode }: QuickClassifyPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNodes = nodes.filter(node =>
    node.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.variableName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort: unclassified nodes first (at top), classified nodes sink to bottom
  const sortedNodes = [...filteredNodes].sort((a, b) => {
    const aClassified = a.classification || a.isDesirable;
    const bClassified = b.classification || b.isDesirable;
    if (aClassified && !bClassified) return 1;  // classified sinks to bottom
    if (!aClassified && bClassified) return -1; // unclassified stays at top
    return a.displayName.localeCompare(b.displayName);
  });

  const handleClassify = (node: CausalNode, type: 'intervenable' | 'observable' | 'desirable') => {
    if (type === 'desirable') {
      // Toggle desirable status
      const newDesirable = !node.isDesirable;
      onClassifyNode(node.id, node.classification || null, newDesirable);
    } else {
      // Toggle classification - if already this type, clear it
      const newClassification = node.classification === type ? null : type;
      onClassifyNode(node.id, newClassification, type === 'observable' ? node.isDesirable : false);
    }
  };

  const counts = {
    intervenable: nodes.filter(n => n.classification === 'intervenable').length,
    observable: nodes.filter(n => n.classification === 'observable').length,
    desirable: nodes.filter(n => n.isDesirable).length,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-sm text-gray-800 mb-2">Quick Classify Nodes</h3>

        {/* Summary counts */}
        <div className="flex gap-3 text-xs mb-2">
          <span className="flex items-center gap-1">
            <span className="text-blue-600">▲</span>
            <span className="text-gray-600">{counts.intervenable}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-green-600">●</span>
            <span className="text-gray-600">{counts.observable}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-500">★</span>
            <span className="text-gray-600">{counts.desirable}</span>
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Node list */}
      <div className="max-h-64 overflow-y-auto">
        {sortedNodes.map(node => (
          <div
            key={node.id}
            className="flex items-center justify-between px-3 py-2 border-b border-gray-100 hover:bg-gray-50"
          >
            <span className="text-sm text-gray-800 truncate flex-1 mr-2" title={node.description}>
              {node.displayName}
            </span>

            <div className="flex gap-1">
              {/* Intervenable (Triangle) */}
              <button
                onClick={() => handleClassify(node, 'intervenable')}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  node.classification === 'intervenable'
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-500'
                }`}
                title="Intervenable (can manipulate)"
              >
                ▲
              </button>

              {/* Observable (Circle) */}
              <button
                onClick={() => handleClassify(node, 'observable')}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  node.classification === 'observable'
                    ? 'bg-green-100 text-green-600 ring-2 ring-green-400'
                    : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500'
                }`}
                title="Observable (can measure)"
              >
                ●
              </button>

              {/* Desirable (Star) */}
              <button
                onClick={() => handleClassify(node, 'desirable')}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                  node.isDesirable
                    ? 'bg-amber-100 text-amber-500 ring-2 ring-amber-400'
                    : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-400'
                }`}
                title="Desirable (outcome we want)"
              >
                ★
              </button>
            </div>
          </div>
        ))}

        {sortedNodes.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            No nodes match your search
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickClassifyPanel;
