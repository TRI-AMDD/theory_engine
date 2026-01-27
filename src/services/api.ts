import { AzureOpenAI } from 'openai';
import type { CausalNode, CausalEdge, CausalGraph, ActionSpace, Proposal, ExistingNodeProposal, ProposalConfig, WhyzenMetadata, HypothesisGenerationConfig, Hypothesis } from '../types';

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

// Azure OpenAI configuration - supports both env vars and runtime config
let endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
let apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY || '';
let deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

// Check localStorage for saved config
const savedConfig = localStorage.getItem('causeway-api-config');
if (savedConfig) {
  try {
    const config = JSON.parse(savedConfig);
    if (config.endpoint) endpoint = config.endpoint;
    if (config.apiKey) apiKey = config.apiKey;
    if (config.deploymentName) deploymentName = config.deploymentName;
  } catch {
    // Invalid saved config, ignore
  }
}

// Validate configuration
if (!endpoint || !apiKey) {
  console.warn('Azure OpenAI not configured. Use the API Key button or set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
}

let client = new AzureOpenAI({
  endpoint: endpoint || 'https://placeholder.openai.azure.com',
  apiKey: apiKey || 'missing-key',
  apiVersion: '2024-08-01-preview',
  dangerouslyAllowBrowser: true
});

// API configuration functions
export function isApiConfigured(): boolean {
  return !!(endpoint && apiKey);
}

export function getApiConfig(): { endpoint: string; apiKey: string; deploymentName: string } {
  return { endpoint, apiKey: apiKey ? '••••••••' : '', deploymentName };
}

export function setApiConfig(config: { endpoint: string; apiKey: string; deploymentName?: string }): void {
  endpoint = config.endpoint;
  apiKey = config.apiKey;
  if (config.deploymentName) deploymentName = config.deploymentName;

  // Save to localStorage
  localStorage.setItem('causeway-api-config', JSON.stringify({
    endpoint,
    apiKey,
    deploymentName
  }));

  // Recreate client with new config
  client = new AzureOpenAI({
    endpoint: endpoint || 'https://placeholder.openai.azure.com',
    apiKey: apiKey || 'missing-key',
    apiVersion: '2024-08-01-preview',
    dangerouslyAllowBrowser: true
  });
}

export function clearApiConfig(): void {
  endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || '';
  apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY || '';
  deploymentName = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
  localStorage.removeItem('causeway-api-config');

  client = new AzureOpenAI({
    endpoint: endpoint || 'https://placeholder.openai.azure.com',
    apiKey: apiKey || 'missing-key',
    apiVersion: '2024-08-01-preview',
    dangerouslyAllowBrowser: true
  });
}

// Ollama configuration
export type LLMProvider = 'azure' | 'ollama';

export interface OllamaConfig {
  endpoint: string;  // e.g., http://localhost:11434
  model: string;     // e.g., llama2, mistral
}

let ollamaConfig: OllamaConfig | null = null;

export function setOllamaConfig(config: OllamaConfig | null) {
  ollamaConfig = config;
  if (config) {
    localStorage.setItem('causeway-ollama-config', JSON.stringify(config));
  } else {
    localStorage.removeItem('causeway-ollama-config');
  }
}

export function getOllamaConfig(): OllamaConfig | null {
  return ollamaConfig;
}

export function getActiveProvider(): LLMProvider {
  return ollamaConfig ? 'ollama' : 'azure';
}

// Load saved Ollama config
const savedOllamaConfig = localStorage.getItem('causeway-ollama-config');
if (savedOllamaConfig) {
  try {
    ollamaConfig = JSON.parse(savedOllamaConfig);
  } catch {
    // Invalid saved config, ignore
  }
}

async function callOllama(prompt: string, systemPrompt?: string, temperature: number = 0.7): Promise<string> {
  if (!ollamaConfig) throw new Error('Ollama not configured');

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${ollamaConfig.endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaConfig.model,
      messages,
      stream: false,
      options: { temperature },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

export async function callLLM(
  prompt: string,
  systemPrompt?: string,
  temperature: number = 0.7,
  maxTokens: number = 1024
): Promise<string> {
  if (ollamaConfig) {
    return callOllama(prompt, systemPrompt, temperature);
  }

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages,
    max_tokens: maxTokens,
    temperature,
  });

  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content in API response');

  return content;
}

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
 * Tracks how many times each concept was proposed (count field)
 */
async function consolidateProposals(
  experimentalContext: string,
  proposals: Proposal[]
): Promise<Proposal[]> {
  // Initialize count for all proposals
  const proposalsWithCount = proposals.map(p => ({ ...p, count: p.count || 1 }));

  if (proposalsWithCount.length < 2) return proposalsWithCount;

  if (!endpoint || !apiKey) return proposalsWithCount;

  const proposalList = proposalsWithCount.map((p, i) =>
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
    if (!content) return proposalsWithCount;

    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (!parsed.mergeGroups || !Array.isArray(parsed.mergeGroups) || parsed.mergeGroups.length === 0) {
      return proposalsWithCount;
    }

    // Build set of indices to skip (merged into another) and track counts
    const mergedIndices = new Set<number>();
    const countBoosts = new Map<number, number>(); // keepIndex -> additional count from merges

    for (const group of parsed.mergeGroups) {
      if (!Array.isArray(group) || group.length < 2) continue;

      // Keep the first one (usually highest quality), mark others as merged
      const keepIndex = group[0];
      if (typeof keepIndex !== 'number' || keepIndex < 0 || keepIndex >= proposalsWithCount.length) continue;
      let additionalCount = 0;

      for (let i = 1; i < group.length; i++) {
        const mergedIndex = group[i];
        if (typeof mergedIndex === 'number' && mergedIndex < proposalsWithCount.length) {
          mergedIndices.add(mergedIndex);
          // Add the count of the merged proposal to the kept one
          additionalCount += proposalsWithCount[mergedIndex].count || 1;
        }
      }

      // Track the count boost for the kept proposal
      countBoosts.set(keepIndex, (countBoosts.get(keepIndex) || 0) + additionalCount);
    }

    // Build result with updated counts
    const result: Proposal[] = [];
    for (let i = 0; i < proposalsWithCount.length; i++) {
      if (!mergedIndices.has(i)) {
        const proposal = proposalsWithCount[i];
        // Apply count boost if this proposal absorbed others
        const boost = countBoosts.get(i) || 0;
        result.push({
          ...proposal,
          count: (proposal.count || 1) + boost
        });
      }
    }

    return result;
  } catch {
    return proposalsWithCount;
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
 *
 * The onProposalsUpdate callback receives the full consolidated list after each cycle
 */
export async function generateAndAssessProposals(
  experimentalContext: string,
  selectedNode: CausalNode,
  graphContext: GraphContext,
  previousProposals: Proposal[],
  allNodes: CausalNode[],
  allEdges: { source: string; target: string }[],
  onProposalsUpdate: (proposals: Proposal[]) => void,
  config: ProposalConfig = { numCycles: 2, numProposalsPerCycle: 4 },
  direction: 'upstream' | 'downstream' = 'upstream'
): Promise<Proposal[]> {
  const { parents, ancestors, children, descendants, otherNodes } = graphContext;
  let allProposals: Proposal[] = [];
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

      return assessedProposal;
    });

    const cycleSettled = await Promise.allSettled(cyclePromises);
    const cycleResults = cycleSettled
      .filter((r): r is PromiseFulfilledResult<Proposal> => r.status === 'fulfilled')
      .map(r => r.value);
    allProposals.push(...cycleResults);

    // Consolidate duplicates after each cycle using critic
    allProposals = await consolidateProposals(experimentalContext, allProposals);

    // Update UI with consolidated proposals after each cycle
    onProposalsUpdate([...allProposals]);
  }

  return allProposals;
}

/**
 * Pedagogical explanation of a variable
 */
export interface PedagogicalExplanation {
  paragraphs: [string, string, string];
  relatedNodesSummary: string;
}

/**
 * Generate a pedagogical explanation of a proposed variable
 */
export async function generatePedagogicalExplanation(
  experimentalContext: string,
  variableName: string,
  variableDescription: string,
  allNodes: CausalNode[]
): Promise<PedagogicalExplanation> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const nodeList = allNodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n');

  const nodeNames = allNodes.map(n => n.displayName);

  const prompt = `Provide a pedagogical explanation of the following variable, grounded specifically in the experimental context provided.

EXPERIMENTAL CONTEXT (use this to frame your explanation):
${experimentalContext}

VARIABLE TO EXPLAIN:
Name: ${variableName}
Description: ${variableDescription}

EXISTING VARIABLES IN THE GRAPH:
${nodeList || '(none yet)'}

Write exactly 3 paragraphs, keeping the explanation specific to this experimental context:
1. What this variable is and why it matters specifically in this experiment (reference the experimental context)
2. How it is typically measured or manipulated in this type of experiment, and what factors influence it
3. Its role in causal reasoning within this experiment - what it might cause or be caused by

Then provide a brief summary (1-2 sentences) identifying which existing graph nodes (${nodeNames.join(', ') || 'none yet'}) are most relevant to this variable and why. When mentioning node names, use their exact names as listed.

Respond with JSON only (no markdown):
{
  "paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "relatedNodesSummary": "Summary mentioning relevant node names exactly as listed..."
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific educator explaining causal variables clearly and pedagogically. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1500,
    temperature: 0.6
  });

  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed.paragraphs) || parsed.paragraphs.length !== 3 ||
        typeof parsed.relatedNodesSummary !== 'string') {
      throw new Error('Invalid response format');
    }
    return parsed as PedagogicalExplanation;
  } catch {
    throw new Error(`Failed to parse explanation: ${cleaned.slice(0, 100)}...`);
  }
}

/**
 * Expansion proposal - a subgraph that replaces a single node
 */
export interface ExpansionProposal {
  nodes: Array<{
    id: string;
    displayName: string;
    description: string;
    role: 'parent' | 'child' | 'internal';  // parent=upstream cause, child=downstream effect, internal=mediator
  }>;
  edges: Array<{
    source: string;
    target: string;
    rationale: string;
  }>;
  rationale: string;
}

type ExpansionLevel = 'light' | 'medium' | 'heavy';

/**
 * Propose an expansion of a single node into a subgraph
 */
export async function proposeNodeExpansion(
  experimentalContext: string,
  nodeToExpand: CausalNode,
  allNodes: CausalNode[],
  allEdges: CausalEdge[],
  level: ExpansionLevel,
  hint?: string
): Promise<ExpansionProposal> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  // Find current connections
  const incomingEdges = allEdges.filter(e => e.target === nodeToExpand.id);
  const outgoingEdges = allEdges.filter(e => e.source === nodeToExpand.id);

  const incomingList = incomingEdges.map(e => {
    const source = allNodes.find(n => n.id === e.source);
    return source?.displayName || e.source;
  }).join(', ') || '(none)';

  const outgoingList = outgoingEdges.map(e => {
    const target = allNodes.find(n => n.id === e.target);
    return target?.displayName || e.target;
  }).join(', ') || '(none)';

  // Level-specific guidance
  const levelGuidance = {
    light: 'Propose 2-3 nodes total. Focus on the most important high-level components only.',
    medium: 'Propose 3-5 nodes total. Include key sub-components and their relationships.',
    heavy: 'Propose 5-8 nodes total. Be comprehensive - include all meaningful sub-components, intermediates, and detailed factors.'
  };

  const prompt = `You are helping expand a node in a causal graph into a more detailed subgraph.

EXPERIMENTAL CONTEXT:
${experimentalContext}

NODE TO EXPAND:
Name: ${nodeToExpand.displayName}
ID: ${nodeToExpand.id}
Description: ${nodeToExpand.description}

CURRENT CONNECTIONS:
- Incoming edges from: ${incomingList}
- Outgoing edges to: ${outgoingList}

EXPANSION LEVEL: ${level.toUpperCase()}
${levelGuidance[level]}
${hint ? `\nUSER HINT:\nThe user has provided this guidance: "${hint}"\nPlease take this into account when proposing the expansion.\n` : ''}
Your task: Break down "${nodeToExpand.displayName}" into its constituent parts.

Consider:
- What are the upstream causes/inputs that feed into this concept? (role: "parent")
- What are the downstream effects/outputs? (role: "child")
- Are there internal mediators between inputs and outputs? (role: "internal")
- How do these parts connect to each other?

The expanded nodes will replace the original node. Existing incoming edges will connect to the "parent" nodes, and existing outgoing edges will connect from the "child" nodes.

Respond with JSON only (no markdown):
{
  "nodes": [
    {"id": "snake_case_id", "displayName": "Human Name", "description": "What this represents", "role": "parent|child|internal"}
  ],
  "edges": [
    {"source": "source_id", "target": "target_id", "rationale": "Why this connection"}
  ],
  "rationale": "Overall explanation of this expansion"
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific expert at decomposing complex concepts into their causal components. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2048,
    temperature: 0.6
  });

  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  // Clean markdown
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || typeof parsed.rationale !== 'string') {
      throw new Error('Invalid response structure');
    }

    for (const node of parsed.nodes) {
      if (typeof node.id !== 'string' || typeof node.displayName !== 'string' ||
          typeof node.description !== 'string' || !['parent', 'child', 'internal'].includes(node.role)) {
        throw new Error('Invalid node structure');
      }
    }

    return parsed as ExpansionProposal;
  } catch (err) {
    throw new Error(`Failed to parse expansion proposal: ${cleaned.slice(0, 100)}...`);
  }
}

/**
 * Condensed node proposal response
 */
export interface CondensedNodeProposal {
  id: string;
  displayName: string;
  description: string;
  rationale: string;
}

/**
 * Propose a condensed node that captures the meaning of multiple selected nodes
 */
export async function proposeCondensedNode(
  experimentalContext: string,
  selectedNodes: CausalNode[],
  allNodes: CausalNode[],
  allEdges: CausalEdge[],
  hint?: string
): Promise<CondensedNodeProposal> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  if (selectedNodes.length < 2) {
    throw new Error('Need at least 2 nodes to condense');
  }

  // Build context about the selected nodes
  const selectedNodesList = selectedNodes.map(n =>
    `- ${n.displayName} (${n.id}): ${n.description}`
  ).join('\n');

  // Find edges involving these nodes
  const selectedIds = new Set(selectedNodes.map(n => n.id));
  const incomingEdges = allEdges.filter(e => selectedIds.has(e.target) && !selectedIds.has(e.source));
  const outgoingEdges = allEdges.filter(e => selectedIds.has(e.source) && !selectedIds.has(e.target));
  const internalEdges = allEdges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));

  const incomingList = incomingEdges.map(e => {
    const source = allNodes.find(n => n.id === e.source);
    const target = allNodes.find(n => n.id === e.target);
    return `${source?.displayName || e.source} → ${target?.displayName || e.target}`;
  }).join(', ') || '(none)';

  const outgoingList = outgoingEdges.map(e => {
    const source = allNodes.find(n => n.id === e.source);
    const target = allNodes.find(n => n.id === e.target);
    return `${source?.displayName || e.source} → ${target?.displayName || e.target}`;
  }).join(', ') || '(none)';

  const internalList = internalEdges.map(e => {
    const source = allNodes.find(n => n.id === e.source);
    const target = allNodes.find(n => n.id === e.target);
    return `${source?.displayName || e.source} → ${target?.displayName || e.target}`;
  }).join(', ') || '(none)';

  // Build list of other nodes for context
  const otherNodesList = allNodes
    .filter(n => !selectedIds.has(n.id))
    .map(n => `- ${n.displayName}: ${n.description}`)
    .join('\n') || '(none)';

  const prompt = `You are helping simplify a causal graph by condensing multiple related nodes into a single concept.

EXPERIMENTAL CONTEXT:
${experimentalContext}

NODES TO CONDENSE:
${selectedNodesList}

RELATIONSHIPS BETWEEN SELECTED NODES (internal):
${internalList}

INCOMING EDGES (from other nodes TO selected nodes):
${incomingList}

OUTGOING EDGES (from selected nodes TO other nodes):
${outgoingList}

OTHER NODES IN GRAPH:
${otherNodesList}
${hint ? `\nUSER HINT:\nThe user has provided this guidance: "${hint}"\nPlease take this into account when proposing the condensed node.\n` : ''}
Your task: Propose a SINGLE condensed node that captures the collective meaning of the selected nodes.

Consider:
- What higher-level concept encompasses all these nodes?
- How do they relate to each other (the internal edges)?
- What role do they play together in the causal structure?
- The condensed node will inherit all incoming and outgoing connections

Respond with JSON only (no markdown):
{
  "id": "snake_case_id",
  "displayName": "Human Readable Name",
  "description": "What this condensed concept represents",
  "rationale": "Why this condensation makes sense"
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a scientific expert at abstracting and consolidating causal concepts. Respond with JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 1024,
    temperature: 0.5
  });

  addTokenUsage(response.usage);

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content in API response');
  }

  // Clean markdown
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.id !== 'string' || typeof parsed.displayName !== 'string' ||
        typeof parsed.description !== 'string' || typeof parsed.rationale !== 'string') {
      throw new Error('Invalid response format');
    }
    return parsed as CondensedNodeProposal;
  } catch {
    throw new Error(`Failed to parse condensed node proposal: ${cleaned.slice(0, 100)}...`);
  }
}

/**
 * Validate WhyzenMetadata response item
 */
function validateWhyzenMetadataItem(parsed: unknown): parsed is {
  nodeId: string;
  metadata: WhyzenMetadata;
} {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.nodeId !== 'string') return false;
  if (typeof obj.metadata !== 'object' || obj.metadata === null) return false;
  const meta = obj.metadata as Record<string, unknown>;
  return (
    typeof meta.node_type === 'string' &&
    (meta.mechanism_type === null || typeof meta.mechanism_type === 'string') &&
    (meta.kernel_type === null || typeof meta.kernel_type === 'string') &&
    typeof meta.kernel_params === 'object' && meta.kernel_params !== null &&
    typeof meta.level === 'string'
  );
}

/**
 * Generate WhyzenMetadata suggestions for nodes in a causal graph
 * Uses LLM to suggest appropriate node types, mechanism types, kernel types, and parameters
 */
export async function generateWhyzenMetadata(
  experimentalContext: string,
  nodes: CausalNode[],
  edges: CausalEdge[],
  hasParent: Set<string>
): Promise<Array<{ nodeId: string; metadata: WhyzenMetadata }>> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured. Set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_API_KEY in .env');
  }

  if (nodes.length === 0) {
    return [];
  }

  // Build node list with parent information
  const nodeList = nodes.map(n => {
    const isRoot = !hasParent.has(n.id);
    return `- ${n.id}: "${n.displayName}" - ${n.description} [${isRoot ? 'ROOT (no parents)' : 'HAS PARENTS'}]`;
  }).join('\n');

  // Build edge list for context
  const edgeList = edges.map(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    const targetNode = nodes.find(n => n.id === e.target);
    return `- ${sourceNode?.displayName || e.source} → ${targetNode?.displayName || e.target}`;
  }).join('\n') || '(no edges)';

  const prompt = `You are helping configure a causal inference model. For each node in the causal graph, suggest appropriate WhyzenMetadata.

EXPERIMENTAL CONTEXT:
${experimentalContext}

CAUSAL GRAPH NODES:
${nodeList}

CAUSAL RELATIONSHIPS:
${edgeList}

For each node, suggest:
1. node_type:
   - "RootNode" for stochastic root nodes (no parents, with randomness)
   - "DeterministicRootNode" for deterministic root nodes (no parents, fixed values)
   - "Node" for stochastic non-root nodes (has parents, with randomness)
   - "DeterministicNode" for deterministic non-root nodes (has parents, deterministic function of parents)

2. mechanism_type: The functional relationship type (null for root nodes, otherwise one of):
   - "linear" for linear relationships
   - "nonlinear" for nonlinear relationships
   - "additive" for additive noise models
   - "multiplicative" for multiplicative effects
   - Or other appropriate mechanism type based on the variable

3. kernel_type: The kernel for Gaussian Process modeling (or null if not applicable):
   - "gaussian" (RBF kernel) for smooth relationships
   - "linear" for linear relationships
   - "polynomial" for polynomial relationships
   - "matern" for less smooth relationships
   - Or null if not using GP

4. kernel_params: Reasonable default parameters as string values (e.g., {"lengthscale": "1.0", "variance": "1.0"})

5. level: The level at which this variable operates:
   - "global" for experiment-wide constants
   - "experiment" for per-experiment variables (most common)
   - "timepoint" for time-varying measurements

Base your suggestions on the experimental context and what each variable represents scientifically.

Respond with JSON only (no markdown):
[
  {
    "nodeId": "node_id",
    "metadata": {
      "node_type": "RootNode" | "DeterministicRootNode" | "Node" | "DeterministicNode",
      "mechanism_type": "linear" | "nonlinear" | null,
      "kernel_type": "gaussian" | "linear" | null,
      "kernel_params": {"param": "value"},
      "level": "experiment"
    }
  }
]`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [
      {
        role: 'system',
        content: 'You are a causal inference expert helping configure statistical models. Respond with valid JSON only, no markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 2048,
    temperature: 0.4
  });

  // Track token usage
  addTokenUsage(response.usage);

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

  // Parse the JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedContent);
  } catch {
    throw new Error(`Invalid JSON from API: ${cleanedContent.slice(0, 100)}...`);
  }

  // Validate the response is an array
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array response, got: ${JSON.stringify(parsed).slice(0, 100)}...`);
  }

  // Validate and filter each item
  const results: Array<{ nodeId: string; metadata: WhyzenMetadata }> = [];
  for (const item of parsed) {
    if (validateWhyzenMetadataItem(item)) {
      results.push({
        nodeId: item.nodeId,
        metadata: item.metadata
      });
    } else {
      console.warn('Invalid WhyzenMetadata item:', JSON.stringify(item).slice(0, 100));
    }
  }

  return results;
}

// ============================================
// Hypothesis Generation
// ============================================

export interface HypothesisGenerationInput {
  experimentalContext: string;
  graph: CausalGraph;
  intervenables: CausalNode[];
  observables: CausalNode[];
  desirables: CausalNode[];
  actionSpace: ActionSpace;
  conditioningHint?: string;
}

export interface GeneratedHypothesis {
  prescription: string;
  predictions: {
    observables: string;
    desirables: string;
  };
  story: string;
  actionHooks: Array<{
    actionId: string;
    parameters: Record<string, string>;
    instructions: string;
  }>;
  critique: string;
}

export async function generateHypothesis(
  input: HypothesisGenerationInput
): Promise<GeneratedHypothesis> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const nodeMap = new Map(input.graph.nodes.map(n => [n.id, n]));

  const getAncestors = (nodeId: string): string[] => {
    const ancestors: string[] = [];
    const visited = new Set<string>();
    const queue = input.graph.edges
      .filter(e => e.target === nodeId)
      .map(e => e.source);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      ancestors.push(current);
      input.graph.edges
        .filter(e => e.target === current)
        .forEach(e => queue.push(e.source));
    }
    return ancestors;
  };

  const getDescendants = (nodeId: string): string[] => {
    const descendants: string[] = [];
    const visited = new Set<string>();
    const queue = input.graph.edges
      .filter(e => e.source === nodeId)
      .map(e => e.target);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      descendants.push(current);
      input.graph.edges
        .filter(e => e.source === current)
        .forEach(e => queue.push(e.target));
    }
    return descendants;
  };

  const prompt = `You are a scientific hypothesis generator. Given a causal graph and classified variables, generate a testable hypothesis.

EXPERIMENTAL CONTEXT:
${input.experimentalContext}

CAUSAL GRAPH NODES:
${input.graph.nodes.map(n => `- ${n.displayName}: ${n.description}`).join('\n')}

CAUSAL RELATIONSHIPS:
${input.graph.edges.map(e => {
  const source = nodeMap.get(e.source);
  const target = nodeMap.get(e.target);
  return `- ${source?.displayName} → ${target?.displayName}`;
}).join('\n')}

INTERVENABLE VARIABLES (can be manipulated):
${input.intervenables.map(n => {
  const descendants = getDescendants(n.id).map(id => nodeMap.get(id)?.displayName).filter(Boolean);
  return `- ${n.displayName}: ${n.description}\n  Downstream effects: ${descendants.join(', ') || 'None'}`;
}).join('\n')}

OBSERVABLE VARIABLES (can be measured):
${input.observables.map(n => {
  const ancestors = getAncestors(n.id).map(id => nodeMap.get(id)?.displayName).filter(Boolean);
  return `- ${n.displayName}: ${n.description}\n  Upstream causes: ${ancestors.join(', ') || 'None'}`;
}).join('\n')}

DESIRABLE VARIABLES (goals):
${input.desirables.length > 0
  ? input.desirables.map(n => `- ${n.displayName}: ${n.description}`).join('\n')
  : 'None specified'}

AVAILABLE VALIDATION ACTIONS:
${input.actionSpace.actions.map(a =>
  `- ${a.name} (${a.type}): ${a.description}\n  Parameters: ${a.parameterHints?.join(', ') || 'None'}`
).join('\n')}
${input.conditioningHint ? `
USER GUIDANCE:
${input.conditioningHint}

Please take the above guidance into account when generating the hypothesis.
` : ''}
Generate a hypothesis with:
1. PRESCRIPTION: Specific modifications to the intervenable variables
2. OBSERVABLE_PREDICTIONS: What changes will be observed
3. DESIRABLE_PREDICTIONS: How desirable outcomes will be affected
4. STORY: A causal chain explanation using the graph relationships
5. ACTION_HOOKS: For each relevant action, provide specific parameters and instructions
6. CRITIQUE: Potential weaknesses or assumptions in this hypothesis

Respond in JSON format:
{
  "prescription": "...",
  "predictions": {
    "observables": "...",
    "desirables": "..."
  },
  "story": "...",
  "actionHooks": [
    {
      "actionId": "...",
      "parameters": { "param1": "value1" },
      "instructions": "..."
    }
  ],
  "critique": "..."
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from LLM');

  addTokenUsage(response.usage);

  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned) as GeneratedHypothesis;

  return parsed;
}

// ============================================
// Graph Modification Parsing
// ============================================

export type GraphModificationAction =
  | { type: 'add_node'; name: string; description: string; connectTo?: string; direction?: 'upstream' | 'downstream' }
  | { type: 'remove_node'; nodeId: string }
  | { type: 'add_edge'; source: string; target: string }
  | { type: 'remove_edge'; source: string; target: string }
  | { type: 'expand_node'; nodeId: string; hint?: string }
  | { type: 'error'; message: string };

// ============================================
// Hypothesis Refinement
// ============================================

export interface HypothesisRefinementInput {
  hypothesis: {
    prescription: string;
    predictions: { observables: string; desirables: string };
    story: string;
    critique: string;
  };
  userFeedback: string;
  experimentalContext: string;
  nodeNames: string[];
}

export interface RefinedHypothesis {
  prescription: string;
  predictions: { observables: string; desirables: string };
  story: string;
  critique: string;
  refinementNote: string;
}

export async function refineHypothesis(input: HypothesisRefinementInput): Promise<RefinedHypothesis> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const prompt = `You are refining a scientific hypothesis based on user feedback.

EXPERIMENTAL CONTEXT:
${input.experimentalContext}

CURRENT HYPOTHESIS:
Prescription: ${input.hypothesis.prescription}
Observable Predictions: ${input.hypothesis.predictions.observables}
Desirable Predictions: ${input.hypothesis.predictions.desirables}
Causal Story: ${input.hypothesis.story}
Critique: ${input.hypothesis.critique}

GRAPH NODES: ${input.nodeNames.join(', ')}

USER FEEDBACK/QUESTION:
${input.userFeedback}

Based on the user's feedback, provide a refined hypothesis. If it's a question, answer it and adjust the hypothesis accordingly. If it's a modification request, implement it.

Respond in JSON format:
{
  "prescription": "Updated prescription...",
  "predictions": {
    "observables": "Updated observable predictions...",
    "desirables": "Updated desirable predictions..."
  },
  "story": "Updated causal story...",
  "critique": "Updated critique...",
  "refinementNote": "Brief note about what was changed based on feedback"
}`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from LLM');

  addTokenUsage(response.usage);

  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as RefinedHypothesis;
}

// ============================================
// Multi-Hypothesis Generation
// ============================================

export async function generateMultipleHypotheses(
  intervenables: CausalNode[],
  observables: CausalNode[],
  desirables: CausalNode[],
  actionSpace: ActionSpace,
  graph: CausalGraph,
  config: HypothesisGenerationConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<Hypothesis[]> {
  const hypotheses: Hypothesis[] = [];
  const existingPrescriptions: string[] = [];

  for (let i = 0; i < config.count; i++) {
    // Build diversity prompt based on existing hypotheses
    const diversityPrompt = existingPrescriptions.length > 0
      ? `\n\nIMPORTANT: Generate a hypothesis that is DIFFERENT from these already generated:\n${existingPrescriptions.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}\n\nFocus on a different causal pathway, mechanism, or intervention strategy.`
      : '';

    const diversityHint = config.diversityHint
      ? `${config.diversityHint}${diversityPrompt}`
      : diversityPrompt;

    const generated = await generateHypothesis({
      experimentalContext: graph.experimentalContext,
      graph,
      intervenables,
      observables,
      desirables,
      actionSpace,
      conditioningHint: diversityHint || undefined,
    });

    const hypothesis: Hypothesis = {
      id: `hyp-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
      intervenables: intervenables.map(n => n.id),
      observables: observables.map(n => n.id),
      desirables: desirables.map(n => n.id),
      prescription: generated.prescription,
      predictions: generated.predictions,
      story: generated.story,
      actionHooks: generated.actionHooks.map(hook => ({
        ...hook,
        actionName: actionSpace.actions.find(a => a.id === hook.actionId)?.name || 'Unknown',
      })),
      critique: generated.critique,
      status: 'active'
    };

    hypotheses.push(hypothesis);
    existingPrescriptions.push(generated.prescription);

    if (onProgress) {
      onProgress(i + 1, config.count);
    }
  }

  return hypotheses;
}

export async function parseGraphModification(
  command: string,
  graph: CausalGraph
): Promise<GraphModificationAction> {
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI not configured');
  }

  const prompt = `You are a graph modification parser. Given a natural language command and the current graph state, determine the intended modification.

CURRENT GRAPH NODES:
${graph.nodes.map(n => `- ID: ${n.id}, Name: ${n.displayName}, Description: ${n.description}`).join('\n')}

CURRENT GRAPH EDGES:
${graph.edges.map(e => {
  const source = graph.nodes.find(n => n.id === e.source);
  const target = graph.nodes.find(n => n.id === e.target);
  return `- ${source?.displayName} → ${target?.displayName}`;
}).join('\n')}

USER COMMAND: "${command}"

Parse this command and respond with ONE of these JSON formats:

Add a new node:
{"type": "add_node", "name": "node_name", "description": "what it represents", "connectTo": "existing_node_id", "direction": "upstream" or "downstream"}

Remove a node:
{"type": "remove_node", "nodeId": "node_id"}

Add an edge:
{"type": "add_edge", "source": "source_node_id", "target": "target_node_id"}

Remove an edge:
{"type": "remove_edge", "source": "source_node_id", "target": "target_node_id"}

Expand a node into multiple:
{"type": "expand_node", "nodeId": "node_id", "hint": "optional expansion hint"}

If the command is unclear or invalid:
{"type": "error", "message": "explanation of what's wrong"}

Match node names flexibly (case-insensitive, partial matches OK).
Respond with ONLY the JSON, no explanation.`;

  const response = await client.chat.completions.create({
    model: deploymentName,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from LLM');

  addTokenUsage(response.usage);

  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned) as GraphModificationAction;
}
