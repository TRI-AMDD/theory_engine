import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-semibold text-gray-900">Causeway Help</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Overview</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Causeway is an AI-assisted tool for building and exploring causal graphs (DAGs).
              It helps researchers and scientists model cause-and-effect relationships in their
              experiments using Pearl's causal terminology.
            </p>
          </section>

          {/* Getting Started */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Getting Started</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex gap-2">
                <span className="text-green-600 font-medium">Build from Data:</span>
                <span>Upload a CSV/Excel file or manually enter data columns. An AI agent builds an initial causal graph through iterative critique and refinement.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-medium">Load Preset:</span>
                <span>Start with a pre-configured example graph to explore the tool's features.</span>
              </li>
            </ul>
          </section>

          {/* Core Features */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Core Features</h3>

            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Node Selection:</span>
                <span className="ml-1">Click any node to select it. The side panel shows its relationships and available actions.</span>
              </div>

              <div>
                <span className="font-medium text-gray-700">Propose New Parents/Children:</span>
                <span className="ml-1">AI agents propose new causal variables. Multiple agents run in parallel, then a critic consolidates similar proposals. Proposals showing <span className="text-gray-400">(x2)</span> were suggested multiple times (higher confidence).</span>
              </div>

              <div>
                <span className="font-medium text-gray-700">Evaluate Existing Nodes:</span>
                <span className="ml-1">Assess whether unconnected nodes in your graph should be linked to the selected node.</span>
              </div>

              <div>
                <span className="font-medium text-gray-700">Magnifying Glass Icon:</span>
                <span className="ml-1">Click to get a detailed pedagogical explanation of any variable, grounded in your experimental context.</span>
              </div>
            </div>
          </section>

          {/* Special Modes */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Special Modes</h3>

            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <span className="inline-flex items-center gap-1 font-medium text-purple-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  Consolidate Mode:
                </span>
                <span className="ml-1">Select multiple nodes, then ask AI to propose a single condensed node that captures their collective meaning. Preserves incoming/outgoing connections.</span>
              </div>

              <div>
                <span className="inline-flex items-center gap-1 font-medium text-yellow-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand Mode:
                </span>
                <span className="ml-1">Break a single node into a detailed subgraph. Choose light (2-3 nodes), medium (3-5), or heavy (5-8) expansion levels.</span>
              </div>
            </div>
          </section>

          {/* Configuration */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Configuration</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div>
                <span className="font-medium text-gray-700">Proposal Agents:</span>
                <span className="ml-1">Number of parallel AI agents generating proposals per cycle (1-8).</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Cycles:</span>
                <span className="ml-1">Number of generation rounds. Later cycles focus on orthogonal/different proposals (1-5).</span>
              </div>
            </div>
          </section>

          {/* Pearl's Terminology */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Pearl's Causal Terminology</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <span className="font-medium text-blue-800">Parent:</span>
                <span className="text-blue-700 ml-1">Direct cause (one edge away)</span>
              </div>
              <div className="bg-sky-50 p-2 rounded border border-sky-200">
                <span className="font-medium text-sky-800">Ancestor:</span>
                <span className="text-sky-700 ml-1">Indirect cause (multiple edges)</span>
              </div>
              <div className="bg-red-50 p-2 rounded border border-red-200">
                <span className="font-medium text-red-800">Child:</span>
                <span className="text-red-700 ml-1">Direct effect (one edge away)</span>
              </div>
              <div className="bg-pink-50 p-2 rounded border border-pink-200">
                <span className="font-medium text-pink-800">Descendant:</span>
                <span className="text-pink-700 ml-1">Indirect effect (multiple edges)</span>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="text-md font-semibold text-gray-800 mb-2">Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Drag nodes to reposition them; the graph auto-layouts when structure changes.</li>
              <li>The experimental context at the top grounds all AI proposals - keep it detailed.</li>
              <li>Use "Save" to export your graph as JSON for later use.</li>
              <li>Token usage is tracked in the header - reset anytime.</li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          Last updated: January 2026
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
