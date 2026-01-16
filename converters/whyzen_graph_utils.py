"""
Whyzen Graph Utilities

Graph traversal functions for Whyzen StructuralCausalModel instances.
Mirrors the functionality of Causeway's src/utils/graph.ts but operates
on Whyzen models after forward() has been called.

Usage:
    from whyzen_graph_utils import (
        get_node, get_all_nodes, get_parents, get_children,
        get_ancestors, get_descendants, is_ancestor, would_create_cycle
    )

    # After model.forward() or model.get_nodes() has been called:
    parents = get_parents(model, 'some_node')
    ancestors = get_ancestors(model, 'some_node')

    # Or with pre-computed edges:
    edges = {'child': ['parent1', 'parent2'], 'grandchild': ['child']}
    parents = get_parents(model, 'child', edges=edges)
"""

from __future__ import annotations

from typing import (
    Any,
    Dict,
    List,
    Literal,
    Optional,
    Set,
    Tuple,
    TypedDict,
    Union,
)
from collections import deque


class NodeWithDegree(TypedDict):
    """A node with its degree (distance) from a reference node."""
    node: Any
    name: str
    degree: int


RelationshipType = Literal['parent', 'ancestor', 'child', 'descendant', 'self', 'unconnected']


def _get_node_names_from_model(model: Any) -> List[str]:
    """
    Extract all node names from a Whyzen model.

    Nodes are stored as model attributes after forward() is called.
    A valid node has both a 'name' attribute and a '_value' attribute.

    Args:
        model: A Whyzen StructuralCausalModel instance

    Returns:
        List of node names
    """
    node_names = []

    for attr_name in dir(model):
        if attr_name.startswith('_'):
            continue
        try:
            attr = getattr(model, attr_name, None)
            # Check if this looks like a Whyzen node
            if attr is not None and hasattr(attr, 'name') and hasattr(attr, '_value'):
                node_names.append(attr.name)
        except Exception:
            # Skip attributes that raise on access
            continue

    return node_names


def _get_nodes_from_model(model: Any) -> Dict[str, Any]:
    """
    Extract all nodes from a Whyzen model as a dict.

    Args:
        model: A Whyzen StructuralCausalModel instance

    Returns:
        Dict mapping node names to node objects
    """
    nodes = {}

    for attr_name in dir(model):
        if attr_name.startswith('_'):
            continue
        try:
            attr = getattr(model, attr_name, None)
            if attr is not None and hasattr(attr, 'name') and hasattr(attr, '_value'):
                nodes[attr.name] = attr
        except Exception:
            continue

    return nodes


def _extract_edges_from_model(model: Any) -> Dict[str, List[str]]:
    """
    Extract edges from a Whyzen model by analyzing mechanism_inputs.

    In Whyzen, a node's parents are determined by which node values
    appear in its mechanism_inputs dict. We match tensors by their
    data_ptr() or identity.

    Args:
        model: A Whyzen StructuralCausalModel instance

    Returns:
        Dict mapping each node name to a list of its parent names
    """
    nodes = _get_nodes_from_model(model)
    edges: Dict[str, List[str]] = {name: [] for name in nodes}

    # Build a lookup from tensor identity/data_ptr to node name
    value_to_node: Dict[int, str] = {}
    for name, node in nodes.items():
        value = getattr(node, '_value', None)
        if value is not None:
            # Try data_ptr for PyTorch tensors
            if hasattr(value, 'data_ptr'):
                value_to_node[value.data_ptr()] = name
            else:
                # Fall back to id for other objects
                value_to_node[id(value)] = name

    # For each node, check its mechanism_inputs
    for target_name, node in nodes.items():
        mechanism_inputs = getattr(node, 'mechanism_inputs', {})

        if not mechanism_inputs:
            continue

        parents_found: Set[str] = set()

        for input_val in mechanism_inputs.values():
            if input_val is None:
                continue

            # Try to match by data_ptr
            if hasattr(input_val, 'data_ptr'):
                ptr = input_val.data_ptr()
                if ptr in value_to_node:
                    parent_name = value_to_node[ptr]
                    if parent_name != target_name:
                        parents_found.add(parent_name)
                    continue

            # Try to match by id
            obj_id = id(input_val)
            if obj_id in value_to_node:
                parent_name = value_to_node[obj_id]
                if parent_name != target_name:
                    parents_found.add(parent_name)
                continue

            # Try to match by comparing tensor values directly
            for candidate_name, candidate_node in nodes.items():
                if candidate_name == target_name:
                    continue
                candidate_value = getattr(candidate_node, '_value', None)
                if candidate_value is input_val:
                    parents_found.add(candidate_name)
                    break

        edges[target_name] = list(parents_found)

    return edges


def _get_edges(
    model: Any,
    edges: Optional[Dict[str, List[str]]] = None
) -> Dict[str, List[str]]:
    """
    Get edges dict, either from provided edges or by extracting from model.

    Args:
        model: A Whyzen StructuralCausalModel instance
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        Edges dict mapping each node to its parents
    """
    if edges is not None:
        return edges
    return _extract_edges_from_model(model)


def _build_children_map(edges: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """
    Build a reverse mapping from nodes to their children.

    Args:
        edges: Dict mapping each node to its parents

    Returns:
        Dict mapping each node to its children
    """
    children: Dict[str, List[str]] = {name: [] for name in edges}

    for child_name, parent_names in edges.items():
        for parent_name in parent_names:
            if parent_name in children:
                children[parent_name].append(child_name)
            else:
                # Parent might not be in edges dict (external node)
                children[parent_name] = [child_name]

    return children


# =============================================================================
# Public API
# =============================================================================


def get_node(model: Any, name: str) -> Optional[Any]:
    """
    Get a node by name from the model.

    Args:
        model: A Whyzen StructuralCausalModel instance
        name: The node name to find

    Returns:
        The node object if found, None otherwise
    """
    nodes = _get_nodes_from_model(model)
    return nodes.get(name)


def get_all_nodes(model: Any) -> List[Any]:
    """
    Get all nodes from the model.

    Args:
        model: A Whyzen StructuralCausalModel instance

    Returns:
        List of all node objects
    """
    nodes = _get_nodes_from_model(model)
    return list(nodes.values())


def get_node_names(model: Any) -> List[str]:
    """
    Get all node names from the model.

    Args:
        model: A Whyzen StructuralCausalModel instance

    Returns:
        List of all node names
    """
    return _get_node_names_from_model(model)


def get_parents(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get immediate parents (direct causes) of a node.

    In a causal graph, parents are the direct causes - nodes with edges
    pointing to the target node.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to find parents for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of parent node names
    """
    edge_map = _get_edges(model, edges)
    return edge_map.get(node_name, []).copy()


def get_children(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get immediate children (direct effects) of a node.

    In a causal graph, children are the direct effects - nodes that have
    the target node as a parent.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to find children for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of child node names
    """
    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)
    return children_map.get(node_name, []).copy()


def get_ancestors(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get all ancestors (transitive causes) of a node.

    Ancestors include parents, grandparents, and all nodes that can reach
    this node through the directed graph.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to find ancestors for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of all ancestor node names
    """
    edge_map = _get_edges(model, edges)

    visited: Set[str] = set()
    ancestors: List[str] = []

    def traverse(current: str) -> None:
        parents = edge_map.get(current, [])
        for parent in parents:
            if parent not in visited:
                visited.add(parent)
                ancestors.append(parent)
                traverse(parent)

    traverse(node_name)
    return ancestors


def get_descendants(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get all descendants (transitive effects) of a node.

    Descendants include children, grandchildren, and all nodes reachable
    from this node through the directed graph.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to find descendants for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of all descendant node names
    """
    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)

    visited: Set[str] = set()
    descendants: List[str] = []

    def traverse(current: str) -> None:
        children = children_map.get(current, [])
        for child in children:
            if child not in visited:
                visited.add(child)
                descendants.append(child)
                traverse(child)

    traverse(node_name)
    return descendants


def get_ancestors_with_degree(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[NodeWithDegree]:
    """
    Get all ancestors with their degree (distance) from the node.

    Uses BFS to find the shortest path distance to each ancestor.
    Degree 1 = parent, degree 2 = grandparent, etc.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to measure from
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of NodeWithDegree dicts sorted by degree
    """
    edge_map = _get_edges(model, edges)
    nodes = _get_nodes_from_model(model)

    visited: Dict[str, int] = {}  # node_name -> degree
    queue: deque[Tuple[str, int]] = deque([(node_name, 0)])

    while queue:
        current, degree = queue.popleft()
        parents = edge_map.get(current, [])

        for parent in parents:
            if parent not in visited:
                visited[parent] = degree + 1
                queue.append((parent, degree + 1))

    result: List[NodeWithDegree] = []
    for name, degree in visited.items():
        result.append({
            'node': nodes.get(name),
            'name': name,
            'degree': degree
        })

    return sorted(result, key=lambda x: x['degree'])


def get_descendants_with_degree(
    model: Any,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[NodeWithDegree]:
    """
    Get all descendants with their degree (distance) from the node.

    Uses BFS to find the shortest path distance to each descendant.
    Degree 1 = child, degree 2 = grandchild, etc.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_name: The node to measure from
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of NodeWithDegree dicts sorted by degree
    """
    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)
    nodes = _get_nodes_from_model(model)

    visited: Dict[str, int] = {}  # node_name -> degree
    queue: deque[Tuple[str, int]] = deque([(node_name, 0)])

    while queue:
        current, degree = queue.popleft()
        children = children_map.get(current, [])

        for child in children:
            if child not in visited:
                visited[child] = degree + 1
                queue.append((child, degree + 1))

    result: List[NodeWithDegree] = []
    for name, degree in visited.items():
        result.append({
            'node': nodes.get(name),
            'name': name,
            'degree': degree
        })

    return sorted(result, key=lambda x: x['degree'])


def is_ancestor(
    model: Any,
    potential_ancestor: str,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> bool:
    """
    Check if one node is an ancestor of another.

    Args:
        model: A Whyzen StructuralCausalModel instance
        potential_ancestor: The node that might be an ancestor
        node_name: The node to check ancestry for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        True if potential_ancestor is an ancestor of node_name
    """
    if potential_ancestor == node_name:
        return False

    ancestors = get_ancestors(model, node_name, edges=edges)
    return potential_ancestor in ancestors


def is_descendant(
    model: Any,
    potential_descendant: str,
    node_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> bool:
    """
    Check if one node is a descendant of another.

    Args:
        model: A Whyzen StructuralCausalModel instance
        potential_descendant: The node that might be a descendant
        node_name: The node to check descendants for
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        True if potential_descendant is a descendant of node_name
    """
    if potential_descendant == node_name:
        return False

    descendants = get_descendants(model, node_name, edges=edges)
    return potential_descendant in descendants


def get_relationship(
    model: Any,
    node_a: str,
    node_b: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> RelationshipType:
    """
    Determine the relationship between two nodes.

    Returns the most specific relationship from node_a's perspective:
    - 'self': node_a and node_b are the same node
    - 'parent': node_a is a direct parent of node_b
    - 'child': node_a is a direct child of node_b
    - 'ancestor': node_a is an ancestor (but not parent) of node_b
    - 'descendant': node_a is a descendant (but not child) of node_b
    - 'unconnected': no directed path exists between the nodes

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_a: First node
        node_b: Second node
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        The relationship type
    """
    if node_a == node_b:
        return 'self'

    edge_map = _get_edges(model, edges)

    # Check if node_a is a parent of node_b
    parents_of_b = edge_map.get(node_b, [])
    if node_a in parents_of_b:
        return 'parent'

    # Check if node_a is a child of node_b
    parents_of_a = edge_map.get(node_a, [])
    if node_b in parents_of_a:
        return 'child'

    # Check if node_a is an ancestor of node_b
    if is_ancestor(model, node_a, node_b, edges=edge_map):
        return 'ancestor'

    # Check if node_a is a descendant of node_b
    if is_descendant(model, node_a, node_b, edges=edge_map):
        return 'descendant'

    return 'unconnected'


def would_create_cycle(
    model: Any,
    source_name: str,
    target_name: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> bool:
    """
    Check if adding an edge from source to target would create a cycle.

    A cycle would be created if target can already reach source through
    existing edges. Adding source -> target would then complete the cycle.

    Args:
        model: A Whyzen StructuralCausalModel instance
        source_name: The proposed source (cause) node
        target_name: The proposed target (effect) node
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        True if adding the edge would create a cycle
    """
    # Self-loop is always a cycle
    if source_name == target_name:
        return True

    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)

    # Check if target can reach source via existing edges
    # If so, adding source -> target would complete a cycle
    visited: Set[str] = set()

    def can_reach(current: str, goal: str) -> bool:
        if current == goal:
            return True
        if current in visited:
            return False
        visited.add(current)

        # Get all children of current node
        children = children_map.get(current, [])
        for child in children:
            if can_reach(child, goal):
                return True

        return False

    # If target can reach source, adding source -> target creates a cycle
    return can_reach(target_name, source_name)


def get_roots(
    model: Any,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get all root nodes (nodes with no parents).

    Root nodes are exogenous variables - they have no causal inputs
    in the model.

    Args:
        model: A Whyzen StructuralCausalModel instance
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of root node names
    """
    edge_map = _get_edges(model, edges)
    return [name for name, parents in edge_map.items() if not parents]


def get_leaves(
    model: Any,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Get all leaf nodes (nodes with no children).

    Leaf nodes are the final outcomes - nothing depends on them
    in the model.

    Args:
        model: A Whyzen StructuralCausalModel instance
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of leaf node names
    """
    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)
    return [name for name, children in children_map.items() if not children]


def topological_sort(
    model: Any,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Return nodes in topological order (parents before children).

    This is the order in which nodes should be computed to ensure
    all dependencies are available.

    Args:
        model: A Whyzen StructuralCausalModel instance
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of node names in topological order

    Raises:
        ValueError: If the graph contains a cycle
    """
    edge_map = _get_edges(model, edges)

    # Kahn's algorithm
    in_degree: Dict[str, int] = {name: len(parents) for name, parents in edge_map.items()}
    children_map = _build_children_map(edge_map)

    # Start with nodes that have no parents
    queue = deque([name for name, degree in in_degree.items() if degree == 0])
    result: List[str] = []

    while queue:
        node = queue.popleft()
        result.append(node)

        for child in children_map.get(node, []):
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)

    if len(result) != len(edge_map):
        raise ValueError("Graph contains a cycle - topological sort not possible")

    return result


def get_path(
    model: Any,
    source: str,
    target: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> Optional[List[str]]:
    """
    Find a directed path from source to target if one exists.

    Uses BFS to find the shortest path.

    Args:
        model: A Whyzen StructuralCausalModel instance
        source: Starting node
        target: Destination node
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of node names forming the path (inclusive), or None if no path exists
    """
    if source == target:
        return [source]

    edge_map = _get_edges(model, edges)
    children_map = _build_children_map(edge_map)

    # BFS to find shortest path
    visited: Set[str] = {source}
    parent_map: Dict[str, str] = {}  # child -> parent in BFS tree
    queue: deque[str] = deque([source])

    while queue:
        current = queue.popleft()

        for child in children_map.get(current, []):
            if child not in visited:
                visited.add(child)
                parent_map[child] = current

                if child == target:
                    # Reconstruct path
                    path = [target]
                    node = target
                    while node in parent_map:
                        node = parent_map[node]
                        path.append(node)
                    return list(reversed(path))

                queue.append(child)

    return None


def get_common_ancestors(
    model: Any,
    node_a: str,
    node_b: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Find common ancestors of two nodes.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_a: First node
        node_b: Second node
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of node names that are ancestors of both node_a and node_b
    """
    ancestors_a = set(get_ancestors(model, node_a, edges=edges))
    ancestors_b = set(get_ancestors(model, node_b, edges=edges))
    return list(ancestors_a & ancestors_b)


def get_common_descendants(
    model: Any,
    node_a: str,
    node_b: str,
    *,
    edges: Optional[Dict[str, List[str]]] = None
) -> List[str]:
    """
    Find common descendants of two nodes.

    Args:
        model: A Whyzen StructuralCausalModel instance
        node_a: First node
        node_b: Second node
        edges: Optional pre-computed edges dict {node_name: [parent_names]}

    Returns:
        List of node names that are descendants of both node_a and node_b
    """
    descendants_a = set(get_descendants(model, node_a, edges=edges))
    descendants_b = set(get_descendants(model, node_b, edges=edges))
    return list(descendants_a & descendants_b)
