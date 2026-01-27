import type { ReactNode } from 'react';

/**
 * Highlights (bolds) node names within text
 * Returns an array of ReactNodes with matching names wrapped in <strong>
 */
export function highlightNodeNames(text: string, nodeNames: string[]): ReactNode[] {
  if (!text || nodeNames.length === 0) return [text];

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
    // Add bolded match
    parts.push(
      <strong key={keyIndex++} className="font-semibold text-blue-700">
        {match[0]}
      </strong>
    );
    lastIndex = pattern.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
