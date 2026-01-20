import { AzureOpenAI } from 'openai';
import ExcelJS from 'exceljs';
import type { CausalGraph, CausalNode, CausalEdge, DataColumn, GraphBuilderConfig, GraphBuildResult } from '../types';
import type { TokenUsage } from './api';

// Azure OpenAI configuration (reuse from api.ts)
const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

// Local token tracking for this build session
let buildSessionTokens: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

function resetBuildSessionTokens(): void {
  buildSessionTokens = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}

function addBuildTokenUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined): void {
  if (!usage) return;
  buildSessionTokens.promptTokens += usage.prompt_tokens || 0;
  buildSessionTokens.completionTokens += usage.completion_tokens || 0;
  buildSessionTokens.totalTokens += usage.total_tokens || 0;
}

const client = new AzureOpenAI({
  endpoint: endpoint || 'https://placeholder.openai.azure.com',
  apiKey: apiKey || 'missing-key',
  apiVersion: '2024-08-01-preview',
  dangerouslyAllowBrowser: true
});

// ============================================
// Response Validation
// ============================================

interface BuilderResponse {
  nodes: Array<{
    id: string;
    displayName: string;
    description: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    rationale?: string;
  }>;
  reasoning: string;
}

function validateBuilderResponse(parsed: unknown): parsed is BuilderResponse {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;

  for (const node of obj.nodes) {
    if (typeof node !== 'object' || node === null) return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== 'string' || typeof n.displayName !== 'string' || typeof n.description !== 'string') {
      return false;
    }
  }

  for (const edge of obj.edges) {
    if (typeof edge !== 'object' || edge === null) return false;
    const e = edge as Record<string, unknown>;
    if (typeof e.source !== 'string' || typeof e.target !== 'string') {
      return false;
    }
  }

  return typeof obj.reasoning === 'string';
}

interface CriticResponse {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

function validateCriticResponse(parsed: unknown): parsed is CriticResponse {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;

  return (
    typeof obj.isValid === 'boolean' &&
    Array.isArray(obj.issues) &&
    Array.isArray(obj.suggestions)
  );
}

interface ConsolidationResponse {
  mergedNodes: Array<{
    keepId: string;
    mergeIds: string[];
    newDisplayName?: string;
    newDescription?: string;
  }>;
  reasoning: string;
}

function validateConsolidationResponse(parsed: unknown): parsed is ConsolidationResponse {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.mergedNodes)) return false;

  for (const merge of obj.mergedNodes) {
    if (typeof merge !== 'object' || merge === null) return false;
    const m = merge as Record<string, unknown>;
    if (typeof m.keepId !== 'string' || !Array.isArray(m.mergeIds)) {
      return false;
    }
  }

  return typeof obj.reasoning === 'string';
}

// ============================================
// Helper Functions
// ============================================

function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  return cleaned.trim();
}

function formatColumns(columns: DataColumn[]): string {
  return columns.map(col =>
    col.description
      ? `- ${col.name}: ${col.description}`
      : `- ${col.name}`
  ).join('\n');
}

// ============================================
// Graph Building Functions
// ============================================

/**
 * Generate the initial graph structure from data columns and context
 */
async function generateGraphStructure(
  experimentalContext: string,
  columns: DataColumn[],
  previousGraph: CausalGraph | null,
  critiqueFeedback: string[]
): Promise<CausalGraph> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured. Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
  }

  const feedbackSection = critiqueFeedback.length > 0
    ? `\n\nPREVIOUS FEEDBACK TO ADDRESS:\n${critiqueFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
    : '';

  const previousGraphSection = previousGraph
    ? `\n\nPREVIOUS GRAPH STRUCTURE (to refine):\nNodes: ${previousGraph.nodes.map(n => n.displayName).join(', ')}\nEdges: ${previousGraph.edges.map(e => `${e.source} → ${e.target}`).join(', ')}`
    : '';

  const prompt = `You are a causal modeling expert. Build a causal graph (DAG) for this experiment.

EXPERIMENTAL CONTEXT:
${experimentalContext}

AVAILABLE DATA COLUMNS:
${formatColumns(columns)}
${previousGraphSection}${feedbackSection}

CONSTRAINTS:
- Must be a valid DAG (no cycles)
- Prioritize columns that exist in the data
- Use snake_case for variable IDs (matching column names where possible)
- Provide clear display names and descriptions
- Only include plausible causal relationships
- Consider confounders, mediators, and effect modifiers

Respond with JSON only (no markdown):
{
  "nodes": [{"id": "snake_case_id", "displayName": "Human Readable Name", "description": "What this variable represents"}],
  "edges": [{"source": "cause_id", "target": "effect_id", "rationale": "Why this causal relationship exists"}],
  "reasoning": "Overall reasoning for this structure"
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific causal modeling expert. Build valid DAGs with clear causal reasoning. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 4096,
    temperature: 0.5
  });

  addBuildTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  const cleaned = cleanJsonResponse(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Invalid JSON from builder: ${cleaned.slice(0, 200)}...`);
  }

  if (!validateBuilderResponse(parsed)) {
    throw new Error(`Unexpected builder response format: ${JSON.stringify(parsed).slice(0, 200)}...`);
  }

  // Convert to CausalGraph format
  const nodes: CausalNode[] = parsed.nodes.map((n, index) => ({
    id: n.id,
    variableName: n.id,
    displayName: n.displayName,
    description: n.description,
    position: {
      x: 100 + (index % 4) * 200,
      y: 100 + Math.floor(index / 4) * 150
    }
  }));

  const edges: CausalEdge[] = parsed.edges.map((e, index) => ({
    id: `edge-${index}-${Date.now()}`,
    source: e.source,
    target: e.target
  }));

  return {
    nodes,
    edges,
    experimentalContext
  };
}

/**
 * Critique the graph and return feedback for refinement
 */
async function critiqueGraph(
  experimentalContext: string,
  columns: DataColumn[],
  graph: CausalGraph
): Promise<string[]> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const nodeList = graph.nodes.map(n => `- ${n.displayName} (${n.id}): ${n.description}`).join('\n');
  const edgeList = graph.edges.map(e => {
    const sourceNode = graph.nodes.find(n => n.id === e.source);
    const targetNode = graph.nodes.find(n => n.id === e.target);
    return `- ${sourceNode?.displayName || e.source} → ${targetNode?.displayName || e.target}`;
  }).join('\n');

  const prompt = `You are a scientific reviewer evaluating a proposed causal graph.

EXPERIMENTAL CONTEXT:
${experimentalContext}

AVAILABLE DATA COLUMNS:
${formatColumns(columns)}

PROPOSED GRAPH:

Nodes:
${nodeList}

Edges (cause → effect):
${edgeList}

Evaluate:
1. Are all edges scientifically plausible?
2. Are important causal relationships missing (given the available columns)?
3. Are there any likely confounders not represented?
4. Is the DAG structure valid (no cycles)?
5. Are any nodes redundant or too similar to each other?

Respond with JSON only:
{
  "isValid": true/false,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a rigorous scientific critic. Be thorough but constructive. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.3
  });

  addBuildTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return ['Could not critique graph'];
  }

  const cleaned = cleanJsonResponse(content);
  try {
    const parsed = JSON.parse(cleaned);
    if (validateCriticResponse(parsed)) {
      return [...parsed.issues, ...parsed.suggestions];
    }
  } catch {
    // Fall through
  }

  return ['Could not parse critique response'];
}

/**
 * Consolidate duplicate or highly similar nodes in the graph
 */
async function consolidateNodes(
  experimentalContext: string,
  graph: CausalGraph
): Promise<CausalGraph> {
  if (graph.nodes.length < 2) return graph;

  if (!endpoint || !apiKey) {
    return graph; // Skip consolidation if not configured
  }

  const nodeList = graph.nodes.map(n => `- ${n.id}: "${n.displayName}" - ${n.description}`).join('\n');

  const prompt = `Review these nodes from a causal graph for potential duplicates or highly similar concepts that should be merged.

EXPERIMENTAL CONTEXT:
${experimentalContext}

NODES:
${nodeList}

Identify any nodes that represent the same or very similar concepts and should be merged.
Consider: same variable measured differently, synonyms, sub-types that should be combined.

Respond with JSON only:
{
  "mergedNodes": [
    {
      "keepId": "id_to_keep",
      "mergeIds": ["id_to_merge_1", "id_to_merge_2"],
      "newDisplayName": "Optional new name if needed",
      "newDescription": "Optional combined description"
    }
  ],
  "reasoning": "Why these merges were suggested"
}

If no merges are needed, respond with:
{"mergedNodes": [], "reasoning": "All nodes represent distinct concepts"}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a careful analyst identifying conceptual duplicates. Only merge nodes that truly represent the same thing. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.2
  });

  addBuildTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) return graph;

  const cleaned = cleanJsonResponse(content);
  try {
    const parsed = JSON.parse(cleaned);
    if (!validateConsolidationResponse(parsed) || parsed.mergedNodes.length === 0) {
      return graph;
    }

    // Apply merges
    let newGraph = { ...graph, nodes: [...graph.nodes], edges: [...graph.edges] };

    for (const merge of parsed.mergedNodes) {
      // Find the node to keep
      const keepNode = newGraph.nodes.find(n => n.id === merge.keepId);
      if (!keepNode) continue;

      // Update the kept node if new name/description provided
      if (merge.newDisplayName || merge.newDescription) {
        newGraph.nodes = newGraph.nodes.map(n =>
          n.id === merge.keepId
            ? {
                ...n,
                displayName: merge.newDisplayName || n.displayName,
                description: merge.newDescription || n.description
              }
            : n
        );
      }

      // Redirect edges from merged nodes to the kept node
      for (const mergeId of merge.mergeIds) {
        newGraph.edges = newGraph.edges.map(e => ({
          ...e,
          source: e.source === mergeId ? merge.keepId : e.source,
          target: e.target === mergeId ? merge.keepId : e.target
        }));
      }

      // Remove merged nodes
      newGraph.nodes = newGraph.nodes.filter(n => !merge.mergeIds.includes(n.id));

      // Remove self-loops that might have been created
      newGraph.edges = newGraph.edges.filter(e => e.source !== e.target);

      // Remove duplicate edges
      const edgeSet = new Set<string>();
      newGraph.edges = newGraph.edges.filter(e => {
        const key = `${e.source}->${e.target}`;
        if (edgeSet.has(key)) return false;
        edgeSet.add(key);
        return true;
      });
    }

    return newGraph;
  } catch {
    return graph;
  }
}

// ============================================
// Main Export
// ============================================

/**
 * Build a causal graph from experimental context and data columns
 * Uses iterative build-critique-refine cycles with optional node consolidation
 */
export async function buildGraphFromData(
  experimentalContext: string,
  columns: DataColumn[],
  config: GraphBuilderConfig,
  onProgress: (message: string) => void
): Promise<GraphBuildResult> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured. Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
  }

  resetBuildSessionTokens();

  let currentGraph: CausalGraph | null = null;
  let critiqueFeedback: string[] = [];
  let allFeedback: string[] = [];

  for (let i = 0; i < config.iterations; i++) {
    const isFirst = i === 0;
    const isLast = i === config.iterations - 1;

    // Step 1: Build/Refine
    onProgress(isFirst ? 'Building initial structure...' : `Refining (${i}/${config.iterations})...`);

    currentGraph = await generateGraphStructure(
      experimentalContext,
      columns,
      currentGraph,
      critiqueFeedback
    );

    // Step 2: Consolidate duplicates (after each build)
    if (currentGraph.nodes.length > 1) {
      onProgress('Consolidating similar nodes...');
      currentGraph = await consolidateNodes(experimentalContext, currentGraph);
    }

    // Step 3: Critique (skip on last iteration)
    if (!isLast) {
      onProgress('Critiquing structure...');
      critiqueFeedback = await critiqueGraph(
        experimentalContext,
        columns,
        currentGraph
      );
      allFeedback.push(...critiqueFeedback);
    }
  }

  if (!currentGraph) {
    throw new Error('Failed to build graph');
  }

  // Final validation - ensure no cycles
  if (hasCycle(currentGraph)) {
    onProgress('Fixing cycles...');
    currentGraph = removeCycles(currentGraph);
  }

  // Quality check - keep it lean
  onProgress('Quality check...');
  currentGraph = await qualityCheck(experimentalContext, columns, currentGraph);

  return {
    graph: currentGraph,
    iterations: config.iterations,
    critiqueSummary: allFeedback.slice(0, 5).join('; ') || 'No issues found',
    tokenUsage: { ...buildSessionTokens }
  };
}

/**
 * Final quality check - remove weak/speculative edges and orphan nodes
 */
async function qualityCheck(
  experimentalContext: string,
  columns: DataColumn[],
  graph: CausalGraph
): Promise<CausalGraph> {
  if (!endpoint || !apiKey) return graph;
  if (graph.edges.length === 0) return graph;

  const nodeList = graph.nodes.map(n => `${n.id}: ${n.displayName}`).join(', ');
  const edgeList = graph.edges.map(e => {
    const source = graph.nodes.find(n => n.id === e.source);
    const target = graph.nodes.find(n => n.id === e.target);
    return `${source?.displayName || e.source} → ${target?.displayName || e.target}`;
  }).join('\n');

  const columnNames = columns.map(c => c.name).join(', ');

  const prompt = `Review this causal graph for quality. Keep it LEAN - remove speculative edges.

CONTEXT: ${experimentalContext.slice(0, 300)}
DATA COLUMNS: ${columnNames}

NODES: ${nodeList}
EDGES:
${edgeList}

Identify edges to REMOVE (speculative, redundant, or poorly justified).
Only keep edges with strong scientific basis.

Respond with JSON only:
{
  "edgesToRemove": [{"source": "id", "target": "id", "reason": "why remove"}],
  "reasoning": "overall quality assessment"
}

If all edges are justified, return: {"edgesToRemove": [], "reasoning": "All edges justified"}`;

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: 'You are a rigorous scientific editor. Keep causal graphs lean and well-justified. JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1024,
      temperature: 0.2
    });

    addBuildTokenUsage(response.usage);

    const content = response.choices[0]?.message?.content;
    if (!content) return graph;

    const cleaned = cleanJsonResponse(content);
    const parsed = JSON.parse(cleaned);

    if (!parsed.edgesToRemove || !Array.isArray(parsed.edgesToRemove)) return graph;

    // Remove flagged edges
    const edgesToRemove = new Set(
      parsed.edgesToRemove.map((e: { source: string; target: string }) => `${e.source}->${e.target}`)
    );

    let newGraph = {
      ...graph,
      edges: graph.edges.filter(e => !edgesToRemove.has(`${e.source}->${e.target}`))
    };

    // Remove orphan nodes (nodes with no connections) unless they're in original columns
    const columnIds = new Set(columns.map(c => c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')));
    const connectedNodes = new Set<string>();
    for (const edge of newGraph.edges) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    newGraph.nodes = newGraph.nodes.filter(n =>
      connectedNodes.has(n.id) || columnIds.has(n.id)
    );

    return newGraph;
  } catch {
    return graph;
  }
}

/**
 * Check if graph has cycles using DFS
 */
function hasCycle(graph: CausalGraph): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const children = adjacency.get(edge.source);
    if (children) {
      children.push(edge.target);
    }
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const children = adjacency.get(nodeId) || [];
    for (const child of children) {
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      } else if (recStack.has(child)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

/**
 * Remove edges that create cycles (greedy approach)
 */
function removeCycles(graph: CausalGraph): CausalGraph {
  const newEdges: CausalEdge[] = [];
  const tempGraph: CausalGraph = { ...graph, edges: [] };

  for (const edge of graph.edges) {
    tempGraph.edges = [...newEdges, edge];
    if (!hasCycle(tempGraph)) {
      newEdges.push(edge);
    }
  }

  return { ...graph, edges: newEdges };
}

/**
 * Parse CSV text and extract column names
 */
export function parseCSVColumns(csvText: string): string[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const firstLine = lines[0];

  // Handle quoted CSV values
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last column
  if (current) {
    columns.push(current.trim().replace(/^"|"$/g, ''));
  }

  return columns.filter(col => col.length > 0);
}

/**
 * Get preset configuration values
 */
export function getPresetConfig(preset: GraphBuilderConfig['preset']): number {
  switch (preset) {
    case 'fast': return 1;
    case 'balanced': return 2;
    case 'heavy': return 4;
    case 'custom': return 3; // Default for custom
    default: return 2;
  }
}

/**
 * Parse Excel file (xlsx/xls) and extract column names from first row
 */
export async function parseExcelColumns(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Get the first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  // Get the first row (header row)
  const firstRow = worksheet.getRow(1);
  const columns: string[] = [];

  firstRow.eachCell((cell, _colNumber) => {
    const value = cell.value;
    if (value !== null && value !== undefined) {
      // Handle different cell value types
      let stringValue: string;
      if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'number') {
        stringValue = String(value);
      } else if (typeof value === 'object' && 'text' in value) {
        // Rich text
        stringValue = value.text as string;
      } else if (typeof value === 'object' && 'result' in value) {
        // Formula result
        stringValue = String(value.result);
      } else {
        stringValue = String(value);
      }

      const trimmed = stringValue.trim();
      if (trimmed.length > 0) {
        columns.push(trimmed);
      }
    }
  });

  return columns;
}
