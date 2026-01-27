import { useState } from 'react';
import type { CausalGraph } from '../types';
import { parseGraphModification, type GraphModificationAction } from '../services/api';

interface NLGraphCommandProps {
  graph: CausalGraph;
  onAction: (action: GraphModificationAction) => void;
}

export function NLGraphCommand({ graph, onAction }: NLGraphCommandProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<GraphModificationAction | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);

    try {
      const action = await parseGraphModification(command, graph);
      setLastAction(action);

      if (action.type === 'error') {
        setError(action.message);
      } else {
        onAction(action);
        setCommand('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse command');
    } finally {
      setIsProcessing(false);
    }
  };

  const actionDescription = (action: GraphModificationAction): string => {
    switch (action.type) {
      case 'add_node': return `Add node "${action.name}"`;
      case 'remove_node': return `Remove node ${action.nodeId}`;
      case 'add_edge': return `Connect ${action.source} → ${action.target}`;
      case 'remove_edge': return `Disconnect ${action.source} → ${action.target}`;
      case 'expand_node': return `Expand node ${action.nodeId}`;
      case 'error': return action.message;
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="e.g., 'add temperature node upstream of phase'"
          className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!command.trim() || isProcessing}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {isProcessing ? '...' : 'Go'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {lastAction && lastAction.type !== 'error' && (
        <p className="text-xs text-green-600">✓ {actionDescription(lastAction)}</p>
      )}

      <p className="text-xs text-gray-400">
        Try: "add node X", "delete Y", "connect X to Y", "expand Z"
      </p>
    </div>
  );
}
