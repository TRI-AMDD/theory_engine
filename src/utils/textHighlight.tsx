import type { ReactNode } from 'react';
import type { CausalNode } from '../types';

// Node classification info for highlighting
export interface NodeHighlightInfo {
  name: string;
  isIntervenable: boolean;
  isObservable: boolean;
  isDesirable: boolean;
  isInGraph: boolean;
}

/**
 * Build highlight info from graph nodes
 */
export function buildNodeHighlightInfo(nodes: CausalNode[]): NodeHighlightInfo[] {
  return nodes.map(node => ({
    name: node.displayName,
    isIntervenable: node.classification === 'intervenable',
    isObservable: node.classification === 'observable',
    isDesirable: node.isDesirable || false,
    isInGraph: true
  }));
}

/**
 * Get CSS classes for a node based on its classification
 * - Intervenables: green
 * - Observables: blue
 * - Desirables: gold
 * - Observable + Desirable: gold underlined
 * - Other nodes in graph: bold
 */
function getNodeHighlightClasses(info: NodeHighlightInfo): string {
  const classes: string[] = ['font-semibold'];

  if (info.isObservable && info.isDesirable) {
    // Observable + Desirable: gold underlined
    classes.push('text-amber-600', 'underline', 'decoration-amber-600');
  } else if (info.isDesirable) {
    // Desirable only: gold
    classes.push('text-amber-600');
  } else if (info.isIntervenable) {
    // Intervenable: green
    classes.push('text-green-600');
  } else if (info.isObservable) {
    // Observable: blue
    classes.push('text-blue-600');
  } else if (info.isInGraph) {
    // Other nodes in graph: bold (no special color)
    classes.push('text-gray-800');
  }

  return classes.join(' ');
}

/**
 * Highlights node names within text with classification-based colors
 * Returns an array of ReactNodes with matching names styled appropriately
 */
export function highlightNodeNames(
  text: string,
  nodeNames: string[],
  nodeHighlightInfo?: NodeHighlightInfo[]
): ReactNode[] {
  if (!text || nodeNames.length === 0) return [text];

  // Build a map from lowercase name to highlight info
  const infoMap = new Map<string, NodeHighlightInfo>();
  if (nodeHighlightInfo) {
    nodeHighlightInfo.forEach(info => {
      infoMap.set(info.name.toLowerCase(), info);
    });
  }

  // Sort by length descending to match longer names first
  const sortedNames = [...nodeNames].sort((a, b) => b.length - a.length);

  // Escape special regex characters in node names
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create pattern that matches any node name (case insensitive, word boundaries)
  const pattern = new RegExp(
    `\\b(${sortedNames.map(escapeRegex).join('|')})\\b`,
    'gi'
  );

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Get highlight info for this match
    const matchedName = match[0];
    const info = infoMap.get(matchedName.toLowerCase());
    const className = info
      ? getNodeHighlightClasses(info)
      : 'font-semibold text-gray-800'; // Default for unknown nodes

    // Add styled match
    parts.push(
      <span key={keyIndex++} className={className}>
        {matchedName}
      </span>
    );
    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
