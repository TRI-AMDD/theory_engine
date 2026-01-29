# Action DAG and Agent Dispatch Architecture

## Overview

This document describes the architecture for executing consolidated actions as a Directed Acyclic Graph (DAG) with agent-based dispatch. The system enables:

1. **DAG Representation** - Actions modeled as nodes with explicit and implicit dependencies
2. **Agent Dispatch** - Autonomous agents execute actions when their dependencies are satisfied
3. **Long-Running Sessions** - State management for hour-long (or longer) experimental workflows
4. **Async Queryable State** - Real-time progress monitoring and conflict resolution

This architecture extends the existing action consolidation system (see `ActionConsolidationPanel.tsx`, `ActionSpaceCanvas.tsx`) to support actual execution of scientific workflows.

---

## Core Concepts

### Action DAG

The Action DAG represents a workflow where actions are nodes and dependencies are directed edges. An action can only begin execution when all its dependencies have completed successfully.

```typescript
// src/types/actionDag.ts

/**
 * Execution status for an action node
 */
export type ActionNodeStatus =
  | 'pending'      // Waiting for dependencies
  | 'ready'        // Dependencies satisfied, awaiting dispatch
  | 'running'      // Currently being executed by an agent
  | 'completed'    // Successfully finished
  | 'failed'       // Execution failed
  | 'cancelled';   // Manually cancelled

/**
 * A single action in the DAG
 */
export interface ActionNode {
  /** Unique identifier for this action instance */
  actionId: string;

  /** Reference to the ConsolidatedAction definition */
  consolidatedActionId: string;

  /** Current execution status */
  status: ActionNodeStatus;

  /** IDs of actions that must complete before this one can start */
  dependencies: string[];

  /** IDs of actions that depend on this one (computed from dependencies) */
  dependents: string[];

  /** Output/result from execution (populated on completion) */
  result?: ActionResult;

  /** Error information if status is 'failed' */
  error?: ActionError;

  /** ID of the agent currently assigned to execute this action */
  assignedAgentId?: string;

  /** Parameters for this specific execution (may override consolidated params) */
  parameters: Record<string, string>;

  /** Instructions for execution */
  instructions: string;

  /** Timestamp when this action was created */
  createdAt: string;

  /** Timestamp when execution started */
  startedAt?: string;

  /** Timestamp when execution completed/failed */
  completedAt?: string;
}

/**
 * Result of a successful action execution
 */
export interface ActionResult {
  /** Type of output (file, data, reference, etc.) */
  outputType: 'file' | 'data' | 'reference' | 'none';

  /** Output data or file path */
  output?: unknown;

  /** Human-readable summary of what was accomplished */
  summary: string;

  /** Metrics from execution (timing, resources, etc.) */
  metrics?: Record<string, number>;
}

/**
 * Error information for failed actions
 */
export interface ActionError {
  /** Error code for categorization */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Stack trace or detailed error info */
  details?: string;

  /** Whether this error is retryable */
  retryable: boolean;
}

/**
 * The complete Action DAG
 */
export interface ActionDAG {
  /** Unique identifier for this DAG */
  dagId: string;

  /** Human-readable name */
  name: string;

  /** All action nodes in this DAG */
  nodes: Map<string, ActionNode>;

  /** Reference to source hypothesis IDs */
  sourceHypothesisIds: string[];

  /** Reference to the ConsolidatedActionSet this was built from */
  consolidatedActionSetId: string;

  /** Timestamp when DAG was created */
  createdAt: string;

  /** Overall DAG status (derived from node statuses) */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

/**
 * Methods for manipulating the ActionDAG
 */
export interface ActionDAGMethods {
  /** Add a dependency edge from actionA to actionB (B depends on A) */
  addDependency(actionIdA: string, actionIdB: string): void;

  /** Remove a dependency edge */
  removeDependency(actionIdA: string, actionIdB: string): void;

  /** Get all actions that are ready to execute (dependencies satisfied, not yet running) */
  getReadyActions(): ActionNode[];

  /** Mark an action as completed with its result */
  markCompleted(actionId: string, result: ActionResult): void;

  /** Mark an action as failed with error info */
  markFailed(actionId: string, error: ActionError): void;

  /** Cancel an action (and optionally its dependents) */
  cancel(actionId: string, cancelDependents?: boolean): void;

  /** Get topological order of all actions */
  getTopologicalOrder(): ActionNode[];

  /** Validate DAG has no cycles */
  validate(): { valid: boolean; errors: string[] };

  /** Get critical path (longest dependency chain) */
  getCriticalPath(): ActionNode[];
}
```

### Dependency Detection

Dependencies between actions can be specified explicitly by users or detected implicitly from parameter references.

```typescript
// src/services/dependencyDetection.ts

/**
 * Dependency types
 */
export type DependencyType = 'explicit' | 'implicit';

/**
 * A detected dependency between two actions
 */
export interface DetectedDependency {
  /** Source action (must complete first) */
  sourceActionId: string;

  /** Target action (depends on source) */
  targetActionId: string;

  /** How this dependency was detected */
  type: DependencyType;

  /** Confidence level for implicit dependencies */
  confidence?: 'high' | 'medium' | 'low';

  /** Explanation of why this dependency exists */
  reason: string;
}

/**
 * Explicit dependency markers in instructions
 * Users can reference other actions using syntax like:
 *   - "Use output from [action:structure_relaxation]"
 *   - "After [action:md_simulation] completes..."
 *   - "Input: ${output.structure_query.structure_file}"
 */
export const EXPLICIT_DEPENDENCY_PATTERNS = [
  /\[action:(\w+)\]/g,                           // [action:action_id]
  /\$\{output\.(\w+)\.(\w+)\}/g,                 // ${output.action_id.field}
  /after\s+\[?action[:\s]+(\w+)\]?/gi,           // after action: action_id
];

/**
 * Detect explicit dependencies from instruction text
 */
export function detectExplicitDependencies(
  actionId: string,
  instructions: string,
  allActionIds: string[]
): DetectedDependency[] {
  const dependencies: DetectedDependency[] = [];

  for (const pattern of EXPLICIT_DEPENDENCY_PATTERNS) {
    const matches = instructions.matchAll(pattern);
    for (const match of matches) {
      const referencedActionId = match[1];
      if (allActionIds.includes(referencedActionId) && referencedActionId !== actionId) {
        dependencies.push({
          sourceActionId: referencedActionId,
          targetActionId: actionId,
          type: 'explicit',
          reason: `Explicit reference in instructions: "${match[0]}"`
        });
      }
    }
  }

  return dependencies;
}

/**
 * Implicit dependency detection using LLM analysis
 * Analyzes action descriptions and parameters to infer dependencies
 */
export interface ImplicitDependencyDetector {
  /**
   * Analyze a set of actions and detect implicit dependencies
   */
  detectImplicitDependencies(
    actions: ConsolidatedAction[],
    experimentalContext: string
  ): Promise<DetectedDependency[]>;
}

/**
 * Common implicit dependency patterns in scientific workflows
 */
export const IMPLICIT_DEPENDENCY_RULES = {
  // Structure preparation before simulation
  structureBeforeSimulation: {
    sourceTypes: ['crystal_structure_query', 'structure_generation'],
    targetTypes: ['md_simulation', 'matlantis_md', 'xtb_calculation'],
    confidence: 'high' as const,
  },

  // Relaxation before dynamics
  relaxationBeforeDynamics: {
    sourceTypes: ['geometry_optimization', 'relaxation'],
    targetTypes: ['md_simulation', 'molecular_dynamics'],
    confidence: 'high' as const,
  },

  // Simulation before analysis
  simulationBeforeAnalysis: {
    sourceTypes: ['md_simulation', 'matlantis_md'],
    targetTypes: ['trajectory_analysis', 'property_calculation'],
    confidence: 'medium' as const,
  },
};
```

### State Management

Long-running sessions require persistent, async-queryable state that survives browser refreshes and handles concurrent modifications.

```typescript
// src/types/sessionState.ts

/**
 * State for a long-running execution session
 */
export interface SessionState {
  /** Unique session identifier */
  sessionId: string;

  /** Human-readable session name */
  name: string;

  /** The action DAG being executed */
  dag: ActionDAG;

  /** All execution runs within this session */
  runs: ExecutionRun[];

  /** Currently active run (if any) */
  activeRunId?: string;

  /** Session creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Session status */
  status: 'active' | 'paused' | 'completed' | 'archived';

  /** User who owns this session */
  ownerId?: string;

  /** Version number for optimistic concurrency control */
  version: number;
}

/**
 * A single execution attempt of the DAG (or portion of it)
 */
export interface ExecutionRun {
  /** Unique run identifier */
  runId: string;

  /** Session this run belongs to */
  sessionId: string;

  /** When this run started */
  startedAt: string;

  /** When this run ended (if finished) */
  endedAt?: string;

  /** Run status */
  status: 'running' | 'completed' | 'failed' | 'cancelled';

  /** Action IDs included in this run */
  includedActionIds: string[];

  /** Snapshot of action statuses at run start */
  initialSnapshot: Record<string, ActionNodeStatus>;

  /** Trigger for this run (manual, scheduled, retry) */
  trigger: 'manual' | 'scheduled' | 'retry' | 'resume';

  /** Aggregated metrics for this run */
  metrics: RunMetrics;
}

/**
 * Metrics collected during a run
 */
export interface RunMetrics {
  /** Total actions in run */
  totalActions: number;

  /** Actions completed successfully */
  completedActions: number;

  /** Actions that failed */
  failedActions: number;

  /** Actions still pending/running */
  pendingActions: number;

  /** Total execution time in milliseconds */
  totalExecutionTime: number;

  /** Time spent waiting for dependencies */
  waitTime: number;

  /** Estimated tokens used (for LLM-based agents) */
  tokensUsed?: number;
}

/**
 * State change event for real-time updates
 */
export interface StateChangeEvent {
  /** Type of change */
  type: 'action_status' | 'run_status' | 'session_status' | 'agent_assignment';

  /** Timestamp of change */
  timestamp: string;

  /** Session ID */
  sessionId: string;

  /** Affected entity ID */
  entityId: string;

  /** Previous value (for conflict detection) */
  previousValue?: unknown;

  /** New value */
  newValue: unknown;

  /** Source of change (user, agent, system) */
  source: 'user' | 'agent' | 'system';
}

/**
 * Interface for session state persistence
 */
export interface SessionStateStore {
  /** Create a new session */
  createSession(session: Omit<SessionState, 'sessionId' | 'version'>): Promise<SessionState>;

  /** Get a session by ID */
  getSession(sessionId: string): Promise<SessionState | null>;

  /** Update a session with optimistic concurrency control */
  updateSession(
    sessionId: string,
    updates: Partial<SessionState>,
    expectedVersion: number
  ): Promise<SessionState>;

  /** List sessions for a user */
  listSessions(ownerId?: string): Promise<SessionState[]>;

  /** Subscribe to session changes */
  subscribeToChanges(
    sessionId: string,
    callback: (event: StateChangeEvent) => void
  ): () => void;

  /** Archive a session */
  archiveSession(sessionId: string): Promise<void>;
}
```

---

## Agent Dispatch Pattern

Agents are autonomous workers that execute actions. The dispatcher assigns ready actions to available agents and monitors their progress.

```typescript
// src/types/agentDispatch.ts

/**
 * Status of an agent
 */
export interface AgentStatus {
  /** Current state of the agent */
  status: 'idle' | 'busy' | 'error' | 'offline';

  /** Current action being executed (if busy) */
  currentActionId?: string;

  /** Progress within current action (0-100) */
  progress?: number;

  /** Human-readable description of current step */
  currentStep?: string;

  /** Recent log entries */
  logs: AgentLogEntry[];

  /** Timestamp of last heartbeat */
  lastHeartbeat: string;
}

/**
 * Agent log entry
 */
export interface AgentLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent capabilities - what types of actions an agent can handle
 */
export interface AgentCapabilities {
  /** Action types this agent can execute */
  supportedActionTypes: string[];

  /** Maximum concurrent actions */
  maxConcurrent: number;

  /** Whether agent supports cancellation */
  supportsCancellation: boolean;

  /** Estimated throughput (actions per hour) */
  estimatedThroughput?: number;
}

/**
 * Agent registration info
 */
export interface AgentInfo {
  /** Unique agent identifier */
  agentId: string;

  /** Human-readable name */
  name: string;

  /** Agent capabilities */
  capabilities: AgentCapabilities;

  /** Current status */
  status: AgentStatus;

  /** When agent was registered */
  registeredAt: string;
}

/**
 * Result of dispatching an action to an agent
 */
export interface DispatchResult {
  success: boolean;
  agentId?: string;
  error?: string;
  estimatedCompletionTime?: string;
}

/**
 * Agent dispatcher interface
 */
export interface AgentDispatcher {
  /**
   * Dispatch an action to an available agent
   * Returns the assigned agent ID or throws if no agent available
   */
  dispatchAction(action: ActionNode): Promise<DispatchResult>;

  /**
   * Check the status of an agent
   */
  checkAgentStatus(agentId: string): Promise<AgentStatus>;

  /**
   * Cancel an action being executed by an agent
   */
  cancelAgent(agentId: string, actionId: string): Promise<boolean>;

  /**
   * List all registered agents
   */
  listAgents(): Promise<AgentInfo[]>;

  /**
   * Register a new agent
   */
  registerAgent(agent: Omit<AgentInfo, 'status' | 'registeredAt'>): Promise<AgentInfo>;

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): Promise<void>;

  /**
   * Find best agent for a given action
   */
  findBestAgent(action: ActionNode): Promise<AgentInfo | null>;
}

/**
 * Dispatch strategy for selecting agents
 */
export type DispatchStrategy =
  | 'round-robin'      // Distribute evenly across agents
  | 'least-loaded'     // Prefer agents with fewer tasks
  | 'capability-match' // Prefer agents best suited for action type
  | 'priority';        // Respect action priority ordering

/**
 * Configuration for the dispatcher
 */
export interface DispatcherConfig {
  /** Strategy for agent selection */
  strategy: DispatchStrategy;

  /** Maximum retries for failed dispatches */
  maxRetries: number;

  /** Delay between retries (ms) */
  retryDelay: number;

  /** Timeout for agent response (ms) */
  agentTimeout: number;

  /** How often to poll agent status (ms) */
  statusPollInterval: number;
}
```

---

## Backend Options

### Option A: IndexedDB + WebSocket (Browser-Only)

Best for: Local development, single-user scenarios, offline-capable workflows.

```typescript
// src/services/storage/indexedDbStore.ts

/**
 * IndexedDB-based session store
 *
 * Pros:
 * - No backend required
 * - Works offline
 * - Persistent across browser sessions
 * - Good for single-user workflows
 *
 * Cons:
 * - No multi-device sync
 * - Limited query capabilities
 * - Storage limits (~50MB typical)
 */
export class IndexedDBSessionStore implements SessionStateStore {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'causeway-sessions';
  private readonly version = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'sessionId' });
          store.createIndex('ownerId', 'ownerId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Actions store (for large DAGs)
        if (!db.objectStoreNames.contains('actions')) {
          const store = db.createObjectStore('actions', { keyPath: 'actionId' });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Logs store
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('sessionId', 'sessionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // ... implement SessionStateStore methods
}

/**
 * WebSocket handler for real-time updates (local agents)
 */
export class LocalWebSocketAgentBridge {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor(private readonly agentEndpoint: string) {}

  connect(): void {
    this.ws = new WebSocket(this.agentEndpoint);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('Connected to local agent bridge');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleAgentMessage(message);
    };

    this.ws.onclose = () => {
      this.attemptReconnect();
    };
  }

  private handleAgentMessage(message: AgentMessage): void {
    // Route message to appropriate handler
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }
}
```

### Option B: REST API + Database (Scalable)

Best for: Production deployments, multi-user scenarios, enterprise use.

```typescript
// src/services/storage/apiStore.ts

/**
 * REST API-based session store
 *
 * Pros:
 * - Scalable to many users
 * - Server-side validation and authorization
 * - Full query capabilities
 * - Audit logging
 *
 * Cons:
 * - Requires backend deployment
 * - Network latency
 * - More complex setup
 */
export class APISessionStore implements SessionStateStore {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken: string
  ) {}

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.code, error.message);
    }

    return response.json();
  }

  async createSession(session: Omit<SessionState, 'sessionId' | 'version'>): Promise<SessionState> {
    return this.request('POST', '/sessions', session);
  }

  async getSession(sessionId: string): Promise<SessionState | null> {
    try {
      return await this.request('GET', `/sessions/${sessionId}`);
    } catch (e) {
      if (e instanceof APIError && e.code === 'NOT_FOUND') {
        return null;
      }
      throw e;
    }
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionState>,
    expectedVersion: number
  ): Promise<SessionState> {
    return this.request('PATCH', `/sessions/${sessionId}`, {
      ...updates,
      expectedVersion,
    });
  }

  // Real-time updates via Server-Sent Events
  subscribeToChanges(
    sessionId: string,
    callback: (event: StateChangeEvent) => void
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/sessions/${sessionId}/events`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };

    return () => eventSource.close();
  }
}

/**
 * Backend database schema (PostgreSQL)
 */
export const DATABASE_SCHEMA = `
-- Sessions table
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  owner_id VARCHAR(255),
  dag_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_sessions_owner ON sessions(owner_id);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Actions table (normalized for better querying)
CREATE TABLE actions (
  action_id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  consolidated_action_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  parameters JSONB,
  instructions TEXT,
  result JSONB,
  error JSONB,
  assigned_agent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_actions_session ON actions(session_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_agent ON actions(assigned_agent_id);

-- Dependencies table
CREATE TABLE action_dependencies (
  source_action_id UUID REFERENCES actions(action_id) ON DELETE CASCADE,
  target_action_id UUID REFERENCES actions(action_id) ON DELETE CASCADE,
  dependency_type VARCHAR(20) NOT NULL,
  PRIMARY KEY (source_action_id, target_action_id)
);

-- Execution runs table
CREATE TABLE execution_runs (
  run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  trigger VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  metrics JSONB
);

CREATE INDEX idx_runs_session ON execution_runs(session_id);

-- Change events table (for audit and replay)
CREATE TABLE state_events (
  event_id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  source VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_session ON state_events(session_id);
CREATE INDEX idx_events_created ON state_events(created_at);
`;
```

### Option C: Supabase (Recommended for MVP)

Best for: Rapid development, MVP validation, small teams.

```typescript
// src/services/storage/supabaseStore.ts

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

/**
 * Supabase-based session store
 *
 * Pros:
 * - Quick to set up (managed service)
 * - Built-in real-time subscriptions
 * - Row-level security for auth
 * - PostgreSQL underneath (can migrate to Option B)
 * - Generous free tier
 *
 * Cons:
 * - Vendor lock-in (mitigatable - standard PostgreSQL)
 * - Limited customization
 * - Cost at scale
 */
export class SupabaseSessionStore implements SessionStateStore {
  private client: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.client = createClient(supabaseUrl, supabaseAnonKey);
  }

  async createSession(session: Omit<SessionState, 'sessionId' | 'version'>): Promise<SessionState> {
    const { data, error } = await this.client
      .from('sessions')
      .insert({
        name: session.name,
        status: session.status,
        owner_id: session.ownerId,
        dag_data: session.dag,
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapToSessionState(data);
  }

  async getSession(sessionId: string): Promise<SessionState | null> {
    const { data, error } = await this.client
      .from('sessions')
      .select('*, actions(*), execution_runs(*)')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return this.mapToSessionState(data);
  }

  async updateSession(
    sessionId: string,
    updates: Partial<SessionState>,
    expectedVersion: number
  ): Promise<SessionState> {
    // Optimistic concurrency using version check
    const { data, error } = await this.client
      .from('sessions')
      .update({
        ...updates,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Conflict: Session was modified by another process');
      }
      throw new Error(error.message);
    }

    return this.mapToSessionState(data);
  }

  subscribeToChanges(
    sessionId: string,
    callback: (event: StateChangeEvent) => void
  ): () => void {
    const channel = this.client
      .channel(`session:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'actions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          callback({
            type: 'action_status',
            timestamp: new Date().toISOString(),
            sessionId,
            entityId: payload.new?.action_id || payload.old?.action_id,
            previousValue: payload.old,
            newValue: payload.new,
            source: 'system',
          });
        }
      )
      .subscribe();

    this.channels.set(sessionId, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(sessionId);
    };
  }

  private mapToSessionState(data: any): SessionState {
    return {
      sessionId: data.session_id,
      name: data.name,
      dag: data.dag_data,
      runs: data.execution_runs || [],
      activeRunId: data.active_run_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      status: data.status,
      ownerId: data.owner_id,
      version: data.version,
    };
  }
}
```

---

## UI Components

### ActionDAGCanvas

A React Flow-based canvas for visualizing and interacting with the Action DAG.

```typescript
// src/components/ActionDAGCanvas.tsx

import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import type { ActionDAG, ActionNode } from '../types/actionDag';

interface ActionDAGCanvasProps {
  dag: ActionDAG;
  selectedActionId: string | null;
  onActionSelect: (actionId: string | null) => void;
  onStartAction: (actionId: string) => void;
  onCancelAction: (actionId: string) => void;
  onRetryAction: (actionId: string) => void;
}

/**
 * Custom node component for action visualization
 */
function ActionDAGNode({ data }: { data: ActionNodeData }) {
  const statusColors = {
    pending: 'bg-gray-200 border-gray-400',
    ready: 'bg-blue-100 border-blue-400 animate-pulse',
    running: 'bg-yellow-100 border-yellow-400',
    completed: 'bg-green-100 border-green-400',
    failed: 'bg-red-100 border-red-400',
    cancelled: 'bg-gray-100 border-gray-300',
  };

  const statusIcons = {
    pending: '⏳',
    ready: '▶️',
    running: '🔄',
    completed: '✅',
    failed: '❌',
    cancelled: '⛔',
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${statusColors[data.status]} min-w-[180px]`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">{data.actionType}</span>
        <span>{statusIcons[data.status]}</span>
      </div>
      <div className="font-medium text-sm">{data.actionName}</div>
      {data.progress !== undefined && data.status === 'running' && (
        <div className="mt-2">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${data.progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{data.currentStep}</div>
        </div>
      )}
      {data.status === 'failed' && data.error && (
        <div className="mt-1 text-xs text-red-600 truncate" title={data.error}>
          {data.error}
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  actionNode: ActionDAGNode,
};

export function ActionDAGCanvas({
  dag,
  selectedActionId,
  onActionSelect,
  onStartAction,
  onCancelAction,
  onRetryAction,
}: ActionDAGCanvasProps) {
  // Build React Flow nodes and edges from DAG
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildDAGGraph(dag, selectedActionId),
    [dag, selectedActionId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update when DAG changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildDAGGraph(dag, selectedActionId);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [dag, selectedActionId, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onActionSelect(node.id === selectedActionId ? null : node.id);
  }, [selectedActionId, onActionSelect]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    const action = dag.nodes.get(node.id);
    if (action?.status === 'ready') {
      onStartAction(node.id);
    } else if (action?.status === 'failed') {
      onRetryAction(node.id);
    }
  }, [dag.nodes, onStartAction, onRetryAction]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const action = dag.nodes.get(node.id);
            switch (action?.status) {
              case 'completed': return '#22c55e';
              case 'running': return '#eab308';
              case 'failed': return '#ef4444';
              case 'ready': return '#3b82f6';
              default: return '#9ca3af';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}

function buildDAGGraph(dag: ActionDAG, selectedActionId: string | null) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });
  g.setDefaultEdgeLabel(() => ({}));

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add nodes
  dag.nodes.forEach((action, actionId) => {
    g.setNode(actionId, { width: 200, height: 80 });
    nodes.push({
      id: actionId,
      type: 'actionNode',
      position: { x: 0, y: 0 },
      data: {
        actionId,
        actionName: action.instructions.slice(0, 50),
        actionType: action.consolidatedActionId,
        status: action.status,
        progress: action.status === 'running' ? 50 : undefined, // Would come from agent status
        currentStep: action.status === 'running' ? 'Processing...' : undefined,
        error: action.error?.message,
        isSelected: actionId === selectedActionId,
      },
    });
  });

  // Add edges
  dag.nodes.forEach((action, actionId) => {
    action.dependencies.forEach(depId => {
      g.setEdge(depId, actionId);
      edges.push({
        id: `${depId}-${actionId}`,
        source: depId,
        target: actionId,
        animated: action.status === 'running',
        style: {
          stroke: action.status === 'completed' ? '#22c55e' : '#94a3b8',
          strokeWidth: 2,
        },
      });
    });
  });

  dagre.layout(g);

  // Apply layout positions
  nodes.forEach(node => {
    const nodeWithPosition = g.node(node.id);
    if (nodeWithPosition) {
      node.position = {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 40,
      };
    }
  });

  return { nodes, edges };
}
```

### ExecutionDashboard

A dashboard for monitoring execution runs and session state.

```typescript
// src/components/ExecutionDashboard.tsx

import { useState, useEffect } from 'react';
import type { SessionState, ExecutionRun, ActionNode } from '../types';

interface ExecutionDashboardProps {
  session: SessionState;
  onStartRun: () => void;
  onPauseRun: () => void;
  onResumeRun: () => void;
  onCancelRun: () => void;
}

export function ExecutionDashboard({
  session,
  onStartRun,
  onPauseRun,
  onResumeRun,
  onCancelRun,
}: ExecutionDashboardProps) {
  const activeRun = session.runs.find(r => r.runId === session.activeRunId);

  // Compute stats
  const stats = computeSessionStats(session);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* Session Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{session.name}</h2>
          <p className="text-sm text-gray-500">
            Session ID: {session.sessionId.slice(0, 8)}...
          </p>
        </div>
        <SessionStatusBadge status={session.status} />
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Overall Progress</span>
          <span>{stats.completedPercentage}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500"
              style={{ width: `${stats.completedPercentage}%` }}
            />
            <div
              className="bg-yellow-500"
              style={{ width: `${stats.runningPercentage}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${stats.failedPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Actions" value={stats.totalActions} />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Running" value={stats.running} color="yellow" />
        <StatCard label="Failed" value={stats.failed} color="red" />
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-6">
        {!activeRun && (
          <button
            onClick={onStartRun}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start Execution
          </button>
        )}
        {activeRun?.status === 'running' && (
          <button
            onClick={onPauseRun}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Pause
          </button>
        )}
        {session.status === 'paused' && (
          <button
            onClick={onResumeRun}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Resume
          </button>
        )}
        {activeRun && (
          <button
            onClick={onCancelRun}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Active Run Details */}
      {activeRun && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-2">Current Run</h3>
          <RunDetails run={activeRun} />
        </div>
      )}

      {/* Run History */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-sm font-semibold mb-2">Run History</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {session.runs
            .filter(r => r.runId !== session.activeRunId)
            .slice(0, 10)
            .map(run => (
              <RunHistoryItem key={run.runId} run={run} />
            ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function computeSessionStats(session: SessionState) {
  const actions = Array.from(session.dag.nodes.values());
  const total = actions.length;
  const completed = actions.filter(a => a.status === 'completed').length;
  const running = actions.filter(a => a.status === 'running').length;
  const failed = actions.filter(a => a.status === 'failed').length;

  return {
    totalActions: total,
    completed,
    running,
    failed,
    pending: total - completed - running - failed,
    completedPercentage: total ? Math.round((completed / total) * 100) : 0,
    runningPercentage: total ? Math.round((running / total) * 100) : 0,
    failedPercentage: total ? Math.round((failed / total) * 100) : 0,
  };
}
```

---

## Implementation Phases

### Phase 1: DAG Visualization (Frontend Only)

**Goal:** Visualize consolidated actions as a DAG in the UI.

**Tasks:**
1. Create `ActionNode` and `ActionDAG` types
2. Implement DAG builder from `ConsolidatedActionSet`
3. Add explicit dependency syntax to action instructions
4. Build `ActionDAGCanvas` component using React Flow
5. Integrate with existing visualization mode toggle

**Integration Points:**
- `ActionConsolidationPanel.tsx` - Add "Build DAG" button
- `App.tsx` - Add new visualization mode (`'dag'`)
- `types/index.ts` - Export new types

**Timeline:** 1-2 days

### Phase 2: Local Execution Simulation

**Goal:** Simulate action execution locally with mock agents.

**Tasks:**
1. Implement `IndexedDBSessionStore` for persistence
2. Create `MockAgentDispatcher` for testing
3. Add execution controls to UI
4. Implement status updates and progress tracking
5. Add session recovery on page reload

**Integration Points:**
- `services/api.ts` - Add session management functions
- `App.tsx` - Add session state and handlers

**Timeline:** 3-4 days

### Phase 3: Agent Integration

**Goal:** Connect to real agent backends.

**Tasks:**
1. Define agent protocol (WebSocket/REST)
2. Implement `WebSocketAgentDispatcher`
3. Add agent registration and discovery
4. Implement retry logic and error handling
5. Add agent status monitoring UI

**Integration Points:**
- New `services/agentDispatch.ts`
- `ExecutionDashboard` agent list panel

**Timeline:** 4-5 days

### Phase 4: Persistent State (Supabase)

**Goal:** Cloud-based state for multi-device access.

**Tasks:**
1. Set up Supabase project and schema
2. Implement `SupabaseSessionStore`
3. Add real-time subscriptions
4. Implement conflict resolution
5. Add user authentication integration

**Integration Points:**
- Environment configuration for Supabase
- `App.tsx` - Auth state management

**Timeline:** 3-4 days

---

## Integration Points

### Existing Code Integration

#### ActionConsolidationPanel.tsx
```typescript
// Add DAG builder button after consolidation
{existingActionSet && (
  <button
    onClick={() => onBuildDAG(existingActionSet)}
    className="w-full py-2 px-4 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700"
  >
    Build Execution DAG
  </button>
)}
```

#### ActionSpaceCanvas.tsx
The Action Space visualization can be extended or replaced with `ActionDAGCanvas` when in execution mode. The existing bipartite graph (hypotheses -> actions) becomes a DAG with execution states.

#### App.tsx
```typescript
// Add new state
const [sessionState, setSessionState] = useState<SessionState | null>(null);
const [executionMode, setExecutionMode] = useState(false);

// Add visualization mode for DAG
type VisualizationMode = 'causal' | 'action-space' | 'execution-dag';

// Add handlers
const handleBuildDAG = useCallback(async (actionSet: ConsolidatedActionSet) => {
  const dag = buildDAGFromActionSet(actionSet);
  const session = await sessionStore.createSession({
    name: `Session ${new Date().toLocaleString()}`,
    dag,
    runs: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  setSessionState(session);
  setVisualizationMode('execution-dag');
}, []);
```

#### api.ts
```typescript
// Add session management exports
export {
  createSession,
  getSession,
  updateSession,
  subscribeToSessionChanges,
} from './services/sessionStore';

export {
  dispatchAction,
  checkAgentStatus,
  cancelAgent,
} from './services/agentDispatch';
```

---

## Appendix: Type Summary

```typescript
// Complete type exports for reference
export type {
  // DAG Types
  ActionNodeStatus,
  ActionNode,
  ActionResult,
  ActionError,
  ActionDAG,
  ActionDAGMethods,

  // Dependency Types
  DependencyType,
  DetectedDependency,

  // Session Types
  SessionState,
  ExecutionRun,
  RunMetrics,
  StateChangeEvent,
  SessionStateStore,

  // Agent Types
  AgentStatus,
  AgentLogEntry,
  AgentCapabilities,
  AgentInfo,
  DispatchResult,
  AgentDispatcher,
  DispatchStrategy,
  DispatcherConfig,
} from './types/actionDag';
```
