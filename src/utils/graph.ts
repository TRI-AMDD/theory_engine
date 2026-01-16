import type { CausalGraph, CausalNode, CausalEdge } from '../types';

/**
 * Get a node by its ID
 * @param graph - The causal graph to search
 * @param id - The node ID to find
 * @returns The node if found, null otherwise
 */
export function getNode(graph: CausalGraph, id: string): CausalNode | null {
  return graph.nodes.find((node) => node.id === id) ?? null;
}

/**
 * Get immediate upstream nodes (direct parents, 1 edge away)
 * Finds edges where target === nodeId and returns their source nodes
 * @param graph - The causal graph
 * @param nodeId - The node ID to find parents for
 * @returns Array of immediate parent nodes
 */
export function getImmediateUpstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const parentIds = graph.edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);

  return graph.nodes.filter((node) => parentIds.includes(node.id));
}

/**
 * Get second-degree upstream nodes (grandparents, exactly 2 edges away)
 * Excludes nodes that are also immediate parents
 * @param graph - The causal graph
 * @param nodeId - The node ID to find grandparents for
 * @returns Array of grandparent nodes (excluding immediate parents)
 */
export function getSecondDegreeUpstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const immediateParents = getImmediateUpstream(graph, nodeId);
  const immediateParentIds = new Set(immediateParents.map((node) => node.id));

  const grandparentIds = new Set<string>();

  for (const parent of immediateParents) {
    const grandparents = getImmediateUpstream(graph, parent.id);
    for (const grandparent of grandparents) {
      // Exclude nodes that are also immediate parents
      if (!immediateParentIds.has(grandparent.id)) {
        grandparentIds.add(grandparent.id);
      }
    }
  }

  return graph.nodes.filter((node) => grandparentIds.has(node.id));
}

/**
 * Get all upstream nodes (all ancestors via recursive traversal)
 * @param graph - The causal graph
 * @param nodeId - The node ID to find all ancestors for
 * @returns Array of all ancestor nodes
 */
export function getAllUpstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const visited = new Set<string>();
  const ancestors: CausalNode[] = [];

  function traverse(currentNodeId: string): void {
    const parents = getImmediateUpstream(graph, currentNodeId);

    for (const parent of parents) {
      if (!visited.has(parent.id)) {
        visited.add(parent.id);
        ancestors.push(parent);
        traverse(parent.id);
      }
    }
  }

  traverse(nodeId);

  return ancestors;
}

/**
 * Node with its degree (distance) from a reference node
 */
export interface NodeWithDegree {
  node: CausalNode;
  degree: number;
}

/**
 * Get all upstream nodes with their degree (minimum distance) from the target node
 * Uses BFS to find shortest paths
 * @param graph - The causal graph
 * @param nodeId - The node ID to measure from
 * @returns Array of nodes with their degrees, sorted by degree
 */
export function getUpstreamWithDegrees(graph: CausalGraph, nodeId: string): NodeWithDegree[] {
  const visited = new Map<string, number>(); // nodeId -> degree
  const queue: { id: string; degree: number }[] = [{ id: nodeId, degree: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const parents = getImmediateUpstream(graph, current.id);

    for (const parent of parents) {
      if (!visited.has(parent.id)) {
        visited.set(parent.id, current.degree + 1);
        queue.push({ id: parent.id, degree: current.degree + 1 });
      }
    }
  }

  const result: NodeWithDegree[] = [];
  for (const [id, degree] of visited) {
    const node = getNode(graph, id);
    if (node) {
      result.push({ node, degree });
    }
  }

  return result.sort((a, b) => a.degree - b.degree);
}

/**
 * Get immediate downstream nodes (direct children, 1 edge away)
 * Finds edges where source === nodeId and returns their target nodes
 * @param graph - The causal graph
 * @param nodeId - The node ID to find children for
 * @returns Array of immediate child nodes
 */
export function getImmediateDownstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const childIds = graph.edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);

  return graph.nodes.filter((node) => childIds.includes(node.id));
}

/**
 * Get all downstream nodes with their degree (minimum distance) from the source node
 * Uses BFS to find shortest paths
 * @param graph - The causal graph
 * @param nodeId - The node ID to measure from
 * @returns Array of nodes with their degrees, sorted by degree
 */
export function getDownstreamWithDegrees(graph: CausalGraph, nodeId: string): NodeWithDegree[] {
  const visited = new Map<string, number>(); // nodeId -> degree
  const queue: { id: string; degree: number }[] = [{ id: nodeId, degree: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = getImmediateDownstream(graph, current.id);

    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.set(child.id, current.degree + 1);
        queue.push({ id: child.id, degree: current.degree + 1 });
      }
    }
  }

  const result: NodeWithDegree[] = [];
  for (const [id, degree] of visited) {
    const node = getNode(graph, id);
    if (node) {
      result.push({ node, degree });
    }
  }

  return result.sort((a, b) => a.degree - b.degree);
}

/**
 * Get nodes that are not yet connected as upstream causes of the given node
 * @param graph - The causal graph
 * @param nodeId - The node ID to check connections for
 * @returns Array of nodes that could potentially be added as upstream causes
 */
export function getUnconnectedUpstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const connectedUpstreamIds = new Set(
    graph.edges.filter((e) => e.target === nodeId).map((e) => e.source)
  );

  return graph.nodes.filter(
    (node) => node.id !== nodeId && !connectedUpstreamIds.has(node.id)
  );
}

/**
 * Get nodes that are not yet connected as downstream effects of the given node
 * @param graph - The causal graph
 * @param nodeId - The node ID to check connections for
 * @returns Array of nodes that could potentially be added as downstream effects
 */
export function getUnconnectedDownstream(graph: CausalGraph, nodeId: string): CausalNode[] {
  const connectedDownstreamIds = new Set(
    graph.edges.filter((e) => e.source === nodeId).map((e) => e.target)
  );

  return graph.nodes.filter(
    (node) => node.id !== nodeId && !connectedDownstreamIds.has(node.id)
  );
}

/**
 * Add a node to the graph (immutable - returns new graph)
 * @param graph - The original causal graph
 * @param node - The node to add
 * @returns A new graph with the node added
 */
export function addNode(graph: CausalGraph, node: CausalNode): CausalGraph {
  return {
    ...graph,
    nodes: [...graph.nodes, node],
  };
}

/**
 * Generate a unique edge ID
 * @param sourceId - The source node ID
 * @param targetId - The target node ID
 * @returns A unique edge ID
 */
function generateEdgeId(sourceId: string, targetId: string): string {
  return `edge-${sourceId}-${targetId}-${Date.now()}`;
}

/**
 * Add an edge to the graph (immutable - returns new graph)
 * @param graph - The original causal graph
 * @param sourceId - The source (cause) node ID
 * @param targetId - The target (effect) node ID
 * @returns A new graph with the edge added
 */
export function addEdge(graph: CausalGraph, sourceId: string, targetId: string): CausalGraph {
  const newEdge: CausalEdge = {
    id: generateEdgeId(sourceId, targetId),
    source: sourceId,
    target: targetId,
  };

  return {
    ...graph,
    edges: [...graph.edges, newEdge],
  };
}

/**
 * Remove an edge from the graph (immutable - returns new graph)
 * @param graph - The original causal graph
 * @param sourceId - The source (cause) node ID
 * @param targetId - The target (effect) node ID
 * @returns A new graph with the edge removed
 */
export function removeEdge(graph: CausalGraph, sourceId: string, targetId: string): CausalGraph {
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => !(edge.source === sourceId && edge.target === targetId)
    ),
  };
}

/**
 * Check if adding an edge would create a cycle in the graph
 * Uses DFS to detect if targetId can already reach sourceId
 * (if so, adding sourceId -> targetId would create a cycle)
 * @param graph - The causal graph
 * @param sourceId - The proposed source (cause) node ID
 * @param targetId - The proposed target (effect) node ID
 * @returns true if adding the edge would create a cycle
 */
export function wouldCreateCycle(graph: CausalGraph, sourceId: string, targetId: string): boolean {
  // Self-loop is always a cycle
  if (sourceId === targetId) {
    return true;
  }

  // Check if targetId can reach sourceId via existing edges
  // If so, adding sourceId -> targetId would complete a cycle
  const visited = new Set<string>();

  function canReach(currentId: string, goalId: string): boolean {
    if (currentId === goalId) {
      return true;
    }
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    // Get all children of current node
    const children = graph.edges
      .filter((edge) => edge.source === currentId)
      .map((edge) => edge.target);

    for (const childId of children) {
      if (canReach(childId, goalId)) {
        return true;
      }
    }

    return false;
  }

  // If targetId can reach sourceId, adding sourceId -> targetId creates a cycle
  return canReach(targetId, sourceId);
}

/**
 * Result of attempting to add an edge
 */
export interface AddEdgeResult {
  success: boolean;
  graph: CausalGraph;
  error?: string;
}

/**
 * Safely add an edge to the graph with cycle detection
 * @param graph - The original causal graph
 * @param sourceId - The source (cause) node ID
 * @param targetId - The target (effect) node ID
 * @returns Result with new graph if successful, or error message if cycle detected
 */
export function addEdgeSafe(graph: CausalGraph, sourceId: string, targetId: string): AddEdgeResult {
  // Check if edge already exists
  const edgeExists = graph.edges.some(
    (edge) => edge.source === sourceId && edge.target === targetId
  );
  if (edgeExists) {
    return {
      success: false,
      graph,
      error: 'This edge already exists',
    };
  }

  // Check for cycle
  if (wouldCreateCycle(graph, sourceId, targetId)) {
    const sourceNode = getNode(graph, sourceId);
    const targetNode = getNode(graph, targetId);
    const sourceName = sourceNode?.displayName || sourceId;
    const targetName = targetNode?.displayName || targetId;
    return {
      success: false,
      graph,
      error: `Cannot add edge: "${sourceName}" → "${targetName}" would create a cycle. Causal graphs must be acyclic (DAGs).`,
    };
  }

  // Safe to add
  const newEdge: CausalEdge = {
    id: generateEdgeId(sourceId, targetId),
    source: sourceId,
    target: targetId,
  };

  return {
    success: true,
    graph: {
      ...graph,
      edges: [...graph.edges, newEdge],
    },
  };
}
