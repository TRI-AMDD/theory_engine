import { AzureOpenAI } from 'openai';
import type { CausalNode, Proposal, ExistingNodeProposal, ProposalConfig } from '../types';

// Token usage tracking
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Global token accumulator
let sessionTokenUsage: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0
};

// Callbacks for token updates
type TokenUpdateCallback = (usage: TokenUsage) => void;
const tokenUpdateCallbacks: TokenUpdateCallback[] = [];

export function subscribeToTokenUpdates(callback: TokenUpdateCallback): () => void {
  tokenUpdateCallbacks.push(callback);
  // Return unsubscribe function
  return () => {
    const index = tokenUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      tokenUpdateCallbacks.splice(index, 1);
    }
  };
}

export function getSessionTokenUsage(): TokenUsage {
  return { ...sessionTokenUsage };
}

export function resetSessionTokenUsage(): void {
  sessionTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  tokenUpdateCallbacks.forEach(cb => cb(sessionTokenUsage));
}

function addTokenUsage(usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined): void {
  if (!usage) return;
  sessionTokenUsage.promptTokens += usage.prompt_tokens || 0;
  sessionTokenUsage.completionTokens += usage.completion_tokens || 0;
  sessionTokenUsage.totalTokens += usage.total_tokens || 0;
  tokenUpdateCallbacks.forEach(cb => cb({ ...sessionTokenUsage }));
}

// Azure OpenAI configuration
const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY;
const deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

// Validate configuration
if (!endpoint || !apiKey) {
  console.warn('Azure OpenAI not configured. Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
}

const client = new AzureOpenAI({
  endpoint: endpoint || 'https://placeholder.openai.azure.com',
  apiKey: apiKey || 'missing-key',
  apiVersion: '2024-08-01-preview',
  dangerouslyAllowBrowser: true
});

/**
 * Validate that the parsed JSON has the expected shape (Pearl terminology)
 */
function validateProposalResponse(parsed: unknown): parsed is {
  variableName: string;
  displayName: string;
  rationale: string;
  relation: 'parent' | 'ancestor' | 'child' | 'descendant';
} {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  return (
    typeof obj.variableName === 'string' &&
    typeof obj.displayName === 'string' &&
    typeof obj.rationale === 'string' &&
    (obj.relation === 'parent' || obj.relation === 'ancestor' ||
     obj.relation === 'child' || obj.relation === 'descendant')
  );
}

/**
 * Build the prompt for the LLM to generate a new upstream cause proposal
 */
/**
 * Build prompt for proposing upstream causes using Pearl's causal terminology
 * Includes full graph context: ancestors, descendants, and unconnected nodes
 */
export function buildPrompt(
  experimentalContext: string,
  selectedNode: CausalNode,
  parents: CausalNode[],
  ancestors: CausalNode[],
  children: CausalNode[],
  descendants: CausalNode[],
  otherNodes: CausalNode[],
  previousProposals: Proposal[]
): string {
  const formatNodes = (nodes: CausalNode[]) =>
    nodes.length > 0
      ? nodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n')
      : '(none)';

  const previousList = previousProposals.length > 0
    ? previousProposals.map(p => p.displayName).join(', ')
    : '(none)';

  return `You are helping extend a causal model for the following experiment:
${experimentalContext}

TARGET VARIABLE: ${selectedNode.displayName}
Description: ${selectedNode.description}

=== CURRENT CAUSAL GRAPH (using Pearl's terminology) ===

ANCESTORS of ${selectedNode.displayName} (upstream causes):
  Parents (direct causes):
${formatNodes(parents)}
  Ancestors (indirect causes):
${formatNodes(ancestors)}

DESCENDANTS of ${selectedNode.displayName} (downstream effects):
  Children (direct effects):
${formatNodes(children)}
  Descendants (indirect effects):
${formatNodes(descendants)}

OTHER NODES (not yet causally connected to ${selectedNode.displayName}):
${formatNodes(otherNodes)}

=== END GRAPH ===

Previously proposed in this session (avoid duplicates):
${previousList}

Propose ONE new variable that could be a CAUSE of ${selectedNode.displayName}.
- A "parent" is a direct cause (one causal step away)
- An "ancestor" is an indirect cause (affects ${selectedNode.displayName} through intermediaries)

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "variableName": "snake_case_name",
  "displayName": "Human Readable Name",
  "rationale": "2-3 sentences explaining the causal mechanism",
  "relation": "parent" or "ancestor"
}`;
}

/**
 * Generate a single proposal with an optional focus variation
 */
async function generateProposalWithVariation(
  experimentalContext: string,
  selectedNode: CausalNode,
  parents: CausalNode[],
  ancestors: CausalNode[],
  children: CausalNode[],
  descendants: CausalNode[],
  otherNodes: CausalNode[],
  previousProposals: Proposal[],
  targetNodeId: string,
  variation: string
): Promise<Proposal> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured. Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
  }

  let prompt = buildPrompt(
    experimentalContext,
    selectedNode,
    parents,
    ancestors,
    children,
    descendants,
    otherNodes,
    previousProposals
  );

  // Add variation to prompt if provided
  if (variation) {
    prompt = prompt + `\n\n${variation}`;
  }

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific assistant helping to extend causal models. Always respond with valid JSON only, no markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.7
  });

  // Track token usage
  addTokenUsage(response.usage);

  // Extract text content from the response
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  // Clean up potential markdown code fences
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  cleanedContent = cleanedContent.trim();

  // Parse and validate the JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error(`Invalid JSON from API: ${cleanedContent.slice(0, 100)}...`);
  }

  if (!validateProposalResponse(parsed)) {
    throw new Error(`Unexpected response format: ${JSON.stringify(parsed).slice(0, 100)}...`);
  }

  // Generate a unique ID for the proposal
  const id = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    id,
    variableName: parsed.variableName,
    displayName: parsed.displayName,
    rationale: parsed.rationale,
    relation: parsed.relation,
    status: 'complete',
    targetNodeId,
    direction: 'upstream' as const
  };
}

// Different focus areas for each parallel call to get diverse proposals
const PROPOSAL_VARIATIONS = [
  'Focus on direct physical or mechanical factors.',
  'Focus on chemical or material properties.',
  'Focus on environmental or experimental conditions.',
  'Focus on systemic or procedural factors (potential ancestors).',
];


/**
 * Validate critic response
 */
function validateCriticResponse(parsed: unknown): parsed is {
  likelihood: 'high' | 'medium' | 'low';
  reason: string;
} {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  return (
    (obj.likelihood === 'high' || obj.likelihood === 'medium' || obj.likelihood === 'low') &&
    typeof obj.reason === 'string'
  );
}

/**
 * Critic agent that assesses proposal likelihood
 * Supports both upstream (cause) and downstream (effect) directions
 */
export async function assessProposal(
  experimentalContext: string,
  selectedNode: CausalNode,
  proposal: Proposal,
  allNodes: CausalNode[],
  allEdges: { source: string; target: string }[],
  direction: 'upstream' | 'downstream' = 'upstream'
): Promise<{ likelihood: 'high' | 'medium' | 'low'; reason: string }> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  // Build graph description
  const nodeList = allNodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n');
  const edgeList = allEdges.map(e => {
    const sourceNode = allNodes.find(n => n.id === e.source);
    const targetNode = allNodes.find(n => n.id === e.target);
    return `- ${sourceNode?.displayName || e.source} → ${targetNode?.displayName || e.target}`;
  }).join('\n');

  // Build direction-specific prompt sections
  const isUpstream = direction === 'upstream';
  const proposalType = isUpstream ? 'upstream cause' : 'downstream effect';
  const relationshipDesc = isUpstream
    ? `${proposal.displayName} → ${selectedNode.displayName} (proposed cause → target)`
    : `${selectedNode.displayName} → ${proposal.displayName} (target → proposed effect)`;

  const evaluationCriteria = isUpstream
    ? `- Is there a known mechanism by which ${proposal.displayName} could cause changes in ${selectedNode.displayName}?
- Is this causal relationship well-established, speculative, or unlikely?
- Does it conflict with or duplicate existing relationships in the graph?
- Could this be a confound rather than a true cause?`
    : `- Is there a known mechanism by which ${selectedNode.displayName} could cause changes in ${proposal.displayName}?
- Is this causal effect well-established, speculative, or unlikely?
- Does it conflict with or duplicate existing relationships in the graph?
- Is this a direct effect or would it require intermediate variables?`;

  const prompt = `You are a scientific critic evaluating proposed causal relationships.

Experiment context:
${experimentalContext}

EXISTING CAUSAL GRAPH:

Variables in the model:
${nodeList}

Established causal relationships (cause → effect):
${edgeList}

PROPOSED ADDITION:

Target variable: ${selectedNode.displayName}
Description: ${selectedNode.description}

Proposed new ${proposalType}: ${proposal.displayName}
Proposed relationship: ${relationshipDesc}
Rationale given: ${proposal.rationale}

Evaluate the scientific plausibility of adding this causal relationship. Consider:
${evaluationCriteria}

Respond ONLY with valid JSON:
{
  "likelihood": "high" | "medium" | "low",
  "reason": "One sentence explaining your assessment"
}

Use "high" for well-established relationships, "medium" for plausible but uncertain, "low" for speculative or unlikely.`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific critic. Be rigorous but fair. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 256,
    temperature: 0.3  // Lower temperature for more consistent assessments
  });

  // Track token usage
  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { likelihood: 'medium', reason: 'Could not assess' };
  }

  // Clean up potential markdown
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (validateCriticResponse(parsed)) {
      return { likelihood: parsed.likelihood, reason: parsed.reason };
    }
  } catch {
    // Fall through to default
  }

  return { likelihood: 'medium', reason: 'Could not assess' };
}

/**
 * Consolidate duplicate/similar proposals into unique ones
 */
async function consolidateProposals(
  experimentalContext: string,
  proposals: Proposal[]
): Promise<Proposal[]> {
  if (proposals.length < 2) return proposals;

  if (!endpoint || !apiKey) return proposals;

  const proposalList = proposals.map((p, i) =>
    `${i}: "${p.displayName}" - ${p.rationale.slice(0, 100)}`
  ).join('\n');

  const prompt = `Review these proposed causal variables for duplicates or very similar concepts that should be merged.

CONTEXT: ${experimentalContext.slice(0, 200)}

PROPOSALS:
${proposalList}

Identify any proposals that represent the same or nearly identical concepts.
Group by index numbers.

Respond with JSON only:
{
  "mergeGroups": [[0, 3], [1, 4]],
  "reasoning": "brief explanation"
}

If no duplicates, return: {"mergeGroups": [], "reasoning": "All unique"}`;

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        { role: 'system', content: 'Identify conceptually duplicate proposals. Be conservative - only merge true duplicates. JSON only.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.2
    });

    addTokenUsage(response.usage);

    const content = response.choices[0]?.message?.content;
    if (!content) return proposals;

    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (!parsed.mergeGroups || !Array.isArray(parsed.mergeGroups) || parsed.mergeGroups.length === 0) {
      return proposals;
    }

    // Build set of indices to skip (merged into another)
    const mergedIndices = new Set<number>();
    const result: Proposal[] = [];

    for (const group of parsed.mergeGroups) {
      if (!Array.isArray(group) || group.length < 2) continue;

      // Keep the first one (usually highest quality), mark others as merged
      const keepIndex = group[0];
      for (let i = 1; i < group.length; i++) {
        mergedIndices.add(group[i]);
      }
    }

    // Add non-merged proposals
    for (let i = 0; i < proposals.length; i++) {
      if (!mergedIndices.has(i)) {
        result.push(proposals[i]);
      }
    }

    return result;
  } catch {
    return proposals;
  }
}

// Second round variations - focused on orthogonalization
const ORTHOGONAL_VARIATIONS = [
  'Propose something DIFFERENT from the existing proposals. Focus on an overlooked physical mechanism.',
  'Propose something DIFFERENT from the existing proposals. Focus on an overlooked chemical or material factor.',
  'Propose something DIFFERENT from the existing proposals. Focus on an overlooked environmental condition.',
  'Propose something DIFFERENT from the existing proposals. Focus on an overlooked procedural or systemic factor.',
];

// Variations for downstream (effect) proposals
const DOWNSTREAM_VARIATIONS = [
  'Focus on direct physical or measurement effects.',
  'Focus on secondary or derived measurements.',
  'Focus on system-level or emergent effects.',
  'Focus on longer-term or cumulative effects.',
];

/**
 * Build prompt for proposing downstream effects (what this variable causes)
 */
/**
 * Build prompt for proposing downstream effects using Pearl's causal terminology
 * Includes full graph context: ancestors, descendants, and unconnected nodes
 */
export function buildDownstreamPrompt(
  experimentalContext: string,
  selectedNode: CausalNode,
  parents: CausalNode[],
  ancestors: CausalNode[],
  children: CausalNode[],
  descendants: CausalNode[],
  otherNodes: CausalNode[],
  previousProposals: Proposal[]
): string {
  const formatNodes = (nodes: CausalNode[]) =>
    nodes.length > 0
      ? nodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n')
      : '(none)';

  const previousList = previousProposals.length > 0
    ? previousProposals.map(p => p.displayName).join(', ')
    : '(none)';

  return `You are helping extend a causal model for the following experiment:
${experimentalContext}

TARGET VARIABLE: ${selectedNode.displayName}
Description: ${selectedNode.description}

=== CURRENT CAUSAL GRAPH (using Pearl's terminology) ===

ANCESTORS of ${selectedNode.displayName} (upstream causes):
  Parents (direct causes):
${formatNodes(parents)}
  Ancestors (indirect causes):
${formatNodes(ancestors)}

DESCENDANTS of ${selectedNode.displayName} (downstream effects):
  Children (direct effects):
${formatNodes(children)}
  Descendants (indirect effects):
${formatNodes(descendants)}

OTHER NODES (not yet causally connected to ${selectedNode.displayName}):
${formatNodes(otherNodes)}

=== END GRAPH ===

Previously proposed in this session (avoid duplicates):
${previousList}

Propose ONE new variable that could be an EFFECT of ${selectedNode.displayName}.
- A "child" is a direct effect (one causal step away)
- A "descendant" is an indirect effect (affected through intermediaries)

Respond ONLY with valid JSON, no markdown, no code fences:
{
  "variableName": "snake_case_name",
  "displayName": "Human Readable Name",
  "rationale": "2-3 sentences explaining the causal mechanism",
  "relation": "child" or "descendant"
}`;
}

/**
 * Generate a downstream effect proposal
 */
async function generateDownstreamProposalWithVariation(
  experimentalContext: string,
  selectedNode: CausalNode,
  parents: CausalNode[],
  ancestors: CausalNode[],
  children: CausalNode[],
  descendants: CausalNode[],
  otherNodes: CausalNode[],
  previousProposals: Proposal[],
  variation: string
): Promise<Proposal> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  let prompt = buildDownstreamPrompt(
    experimentalContext,
    selectedNode,
    parents,
    ancestors,
    children,
    descendants,
    otherNodes,
    previousProposals
  );

  if (variation) {
    prompt = prompt + `\n\n${variation}`;
  }

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific assistant helping to extend causal models. Always respond with valid JSON only, no markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.7
  });

  // Track token usage
  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  let cleanedContent = content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.slice(7);
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.slice(3);
  }
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.slice(0, -3);
  }
  cleanedContent = cleanedContent.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error(`Invalid JSON from API: ${cleanedContent.slice(0, 100)}...`);
  }

  if (!validateProposalResponse(parsed)) {
    throw new Error(`Unexpected response format: ${JSON.stringify(parsed).slice(0, 100)}...`);
  }

  const id = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  return {
    id,
    variableName: parsed.variableName,
    displayName: parsed.displayName,
    rationale: parsed.rationale,
    relation: parsed.relation,
    status: 'complete',
    targetNodeId: selectedNode.id,
    direction: 'downstream'
  };
}

/**
 * Validate existing node assessment response
 */
function validateExistingNodeResponse(parsed: unknown): parsed is {
  nodeId: string;
  likelihood: 'high' | 'medium' | 'low';
  rationale: string;
} {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  return (
    typeof obj.nodeId === 'string' &&
    (obj.likelihood === 'high' || obj.likelihood === 'medium' || obj.likelihood === 'low') &&
    typeof obj.rationale === 'string'
  );
}

/**
 * Evaluate a batch of existing nodes as potential causes/effects
 */
async function evaluateNodesBatch(
  experimentalContext: string,
  selectedNode: CausalNode,
  candidateBatch: CausalNode[],
  direction: 'upstream' | 'downstream'
): Promise<ExistingNodeProposal[]> {
  const candidateList = candidateBatch.map(n => `- ${n.id}: ${n.displayName} - ${n.description}`).join('\n');

  const directionText = direction === 'upstream'
    ? `could be a CAUSE of ${selectedNode.displayName} (would point TO it)`
    : `could be an EFFECT of ${selectedNode.displayName} (it would point TO this node)`;

  // Use a more concise prompt to avoid context limits
  const prompt = `Experiment: ${experimentalContext.slice(0, 500)}${experimentalContext.length > 500 ? '...' : ''}

TARGET: ${selectedNode.displayName}
${selectedNode.description}

Evaluate if each candidate ${directionText}:
${candidateList}

Respond with JSON array only:
[{"nodeId": "id", "likelihood": "high"|"medium"|"low", "rationale": "brief reason"}]`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific critic. Evaluate causal plausibility. JSON only, no markdown.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.3
  });

  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    console.warn('No content in batch response');
    return [];
  }

  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.warn('Response not array:', cleaned.slice(0, 100));
      return [];
    }

    const results: ExistingNodeProposal[] = [];
    for (const item of parsed) {
      if (validateExistingNodeResponse(item)) {
        const node = candidateBatch.find(n => n.id === item.nodeId);
        if (node) {
          results.push({
            id: `existing-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            nodeId: item.nodeId,
            displayName: node.displayName,
            rationale: item.rationale,
            targetNodeId: selectedNode.id,
            direction,
            likelihood: item.likelihood,
            criticReason: item.rationale
          });
        }
      }
    }
    return results;
  } catch (err) {
    console.error('Failed to parse batch response:', err, cleaned.slice(0, 200));
    return [];
  }
}

/**
 * Evaluate existing nodes as potential causes/effects
 * Batches candidates to avoid context limits
 */
export async function evaluateExistingNodes(
  experimentalContext: string,
  selectedNode: CausalNode,
  candidateNodes: CausalNode[],
  direction: 'upstream' | 'downstream',
  _allNodes: CausalNode[],
  _allEdges: { source: string; target: string }[]
): Promise<ExistingNodeProposal[]> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  if (candidateNodes.length === 0) {
    return [];
  }

  // Batch candidates into groups of 8 to keep context manageable
  const BATCH_SIZE = 8;
  const batches: CausalNode[][] = [];
  for (let i = 0; i < candidateNodes.length; i += BATCH_SIZE) {
    batches.push(candidateNodes.slice(i, i + BATCH_SIZE));
  }

  console.log(`Evaluating ${candidateNodes.length} candidates in ${batches.length} batches`);

  // Process batches in parallel (up to 3 at a time to avoid rate limits)
  const allResults: ExistingNodeProposal[] = [];
  const PARALLEL_LIMIT = 3;

  for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
    const batchPromises = batches.slice(i, i + PARALLEL_LIMIT).map(batch =>
      evaluateNodesBatch(experimentalContext, selectedNode, batch, direction)
    );

    const batchResults = await Promise.all(batchPromises);
    for (const results of batchResults) {
      allResults.push(...results);
    }
  }

  // Sort by likelihood
  return allResults.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.likelihood] - order[b.likelihood];
  });
}

/**
 * Graph context for proposal generation (Pearl terminology)
 */
export interface GraphContext {
  parents: CausalNode[];      // Direct causes
  ancestors: CausalNode[];    // Indirect causes (excluding parents)
  children: CausalNode[];     // Direct effects
  descendants: CausalNode[];  // Indirect effects (excluding children)
  otherNodes: CausalNode[];   // Unconnected nodes
}

/**
 * Generate proposals in multiple rounds and assess them with a critic
 * Supports configurable number of cycles and proposals per cycle
 * Supports both upstream (cause) and downstream (effect) directions
 * Uses Pearl's causal terminology and provides full graph context
 */
export async function generateAndAssessProposals(
  experimentalContext: string,
  selectedNode: CausalNode,
  graphContext: GraphContext,
  previousProposals: Proposal[],
  allNodes: CausalNode[],
  allEdges: { source: string; target: string }[],
  onProposalComplete: (proposal: Proposal) => void,
  config: ProposalConfig = { numCycles: 2, numProposalsPerCycle: 4 },
  direction: 'upstream' | 'downstream' = 'upstream'
): Promise<Proposal[]> {
  const { parents, ancestors, children, descendants, otherNodes } = graphContext;
  const allProposals: Proposal[] = [];
  const variations = direction === 'upstream' ? PROPOSAL_VARIATIONS : DOWNSTREAM_VARIATIONS;
  const orthogonalVariations = direction === 'upstream' ? ORTHOGONAL_VARIATIONS : DOWNSTREAM_VARIATIONS.map(v =>
    'Propose something DIFFERENT from existing proposals. ' + v
  );

  for (let cycle = 0; cycle < config.numCycles; cycle++) {
    const isFirstCycle = cycle === 0;
    const cycleVariations = isFirstCycle ? variations : orthogonalVariations;

    // Build context from previous cycles
    const previousContext = allProposals.length > 0
      ? `\n\nProposals already generated this session (propose something ORTHOGONAL and DIFFERENT):\n${allProposals.map(p => `- ${p.displayName}: ${p.rationale}`).join('\n')}`
      : '';

    // Generate proposals for this cycle (up to numProposalsPerCycle)
    const numProposals = Math.min(config.numProposalsPerCycle, cycleVariations.length);
    const cyclePromises = cycleVariations.slice(0, numProposals).map(async (variation) => {
      let proposal: Proposal;

      if (direction === 'upstream') {
        proposal = await generateProposalWithVariation(
          experimentalContext,
          selectedNode,
          parents,
          ancestors,
          children,
          descendants,
          otherNodes,
          [...previousProposals, ...allProposals],
          selectedNode.id,
          variation + previousContext
        );
      } else {
        proposal = await generateDownstreamProposalWithVariation(
          experimentalContext,
          selectedNode,
          parents,
          ancestors,
          children,
          descendants,
          otherNodes,
          [...previousProposals, ...allProposals],
          variation + previousContext
        );
      }

      // Assess with critic (use direction-specific prompt)
      const assessment = await assessProposal(
        experimentalContext,
        selectedNode,
        proposal,
        allNodes,
        allEdges,
        direction
      );

      const assessedProposal: Proposal = {
        ...proposal,
        likelihood: assessment.likelihood,
        criticReason: assessment.reason
      };

      onProposalComplete(assessedProposal);
      return assessedProposal;
    });

    const cycleResults = await Promise.all(cyclePromises);
    allProposals.push(...cycleResults);

    // Consolidate duplicates after each cycle
    const consolidated = await consolidateProposals(experimentalContext, allProposals);

    // If consolidation removed any, update allProposals
    if (consolidated.length < allProposals.length) {
      allProposals.length = 0;
      allProposals.push(...consolidated);
    }
  }

  return allProposals;
}
