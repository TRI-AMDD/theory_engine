import type { ConsolidatedAction, ExportedAction, Hypothesis } from '../types';

/**
 * Export a consolidated action to JSON format
 */
export function exportActionToJson(
  action: ConsolidatedAction,
  hypotheses: Hypothesis[]
): ExportedAction {
  const sourceHypotheses = action.hypothesisLinks.map(link => {
    const hyp = hypotheses.find(h => h.id === link.hypothesisId);
    return hyp?.prescription.slice(0, 100) + '...' || `Hypothesis ${link.hypothesisId}`;
  });

  return {
    name: action.actionName,
    type: action.actionType,
    description: action.description,
    parameters: action.commonParameters,
    instructions: action.consolidatedInstructions,
    sourceHypotheses
  };
}

/**
 * Export multiple actions to a JSON string
 */
export function exportActionsToJsonString(
  actions: ConsolidatedAction[],
  hypotheses: Hypothesis[]
): string {
  const exported = actions.map(a => exportActionToJson(a, hypotheses));
  return JSON.stringify(exported, null, 2);
}

/**
 * Export a consolidated action to Markdown format
 */
export function exportActionToMarkdown(
  action: ConsolidatedAction,
  hypotheses: Hypothesis[]
): string {
  const lines: string[] = [];

  lines.push(`## ${action.actionName}`);
  lines.push('');
  lines.push(`**Type:** ${action.actionType}`);
  lines.push('');
  lines.push(`**Description:** ${action.description}`);
  lines.push('');
  lines.push(`**Utility Score:** ${action.utilityScore} hypotheses`);
  lines.push('');

  // Parameters
  if (Object.keys(action.commonParameters).length > 0) {
    lines.push('### Parameters');
    lines.push('');
    lines.push('| Parameter | Value |');
    lines.push('|-----------|-------|');
    for (const [key, value] of Object.entries(action.commonParameters)) {
      lines.push(`| ${key} | ${value} |`);
    }
    lines.push('');
  }

  // Instructions
  lines.push('### Consolidated Instructions');
  lines.push('');
  lines.push(action.consolidatedInstructions);
  lines.push('');

  // Source hypotheses
  lines.push('### Source Hypotheses');
  lines.push('');
  for (const link of action.hypothesisLinks) {
    const hyp = hypotheses.find(h => h.id === link.hypothesisId);
    if (hyp) {
      lines.push(`- **${hyp.id.slice(-8)}**: ${hyp.prescription.slice(0, 80)}...`);
      lines.push(`  - Parameters: \`${JSON.stringify(link.parameters)}\``);
    }
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Export all actions to a Markdown document
 */
export function exportActionsToMarkdownString(
  actions: ConsolidatedAction[],
  hypotheses: Hypothesis[],
  title?: string
): string {
  const lines: string[] = [];

  lines.push(`# ${title || 'Consolidated Action Plan'}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Total Actions: ${actions.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const action of actions) {
    lines.push(exportActionToMarkdown(action, hypotheses));
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Download a string as a file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
