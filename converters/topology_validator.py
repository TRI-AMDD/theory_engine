"""
Topology Validator for Whyzen ↔ Causeway Graph Conversion

Performs deterministic checks to ensure the graph topology is preserved
when converting between Whyzen and Causeway formats.

Run this as a sanity check after any import/export operation.

Usage:
    from topology_validator import validate_topology, TopologyMismatch

    # After converting Whyzen → Causeway
    validate_topology(whyzen_model, causeway_graph_json)

    # Or standalone check of two edge sets
    validate_edge_sets(edges_a, edges_b)
"""

from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass
import json


class TopologyMismatch(Exception):
    """Raised when graph topologies don't match."""
    pass


@dataclass
class TopologyReport:
    """Report of topology validation results."""
    is_valid: bool
    node_count_match: bool
    edge_count_match: bool
    missing_nodes_in_a: Set[str]
    missing_nodes_in_b: Set[str]
    missing_edges_in_a: Set[Tuple[str, str]]
    missing_edges_in_b: Set[Tuple[str, str]]

    def __str__(self):
        if self.is_valid:
            return "✓ Topology matches"

        lines = ["✗ Topology mismatch:"]
        if not self.node_count_match:
            lines.append(f"  Node count differs")
        if self.missing_nodes_in_a:
            lines.append(f"  Nodes missing in A: {self.missing_nodes_in_a}")
        if self.missing_nodes_in_b:
            lines.append(f"  Nodes missing in B: {self.missing_nodes_in_b}")
        if not self.edge_count_match:
            lines.append(f"  Edge count differs")
        if self.missing_edges_in_a:
            lines.append(f"  Edges missing in A: {list(self.missing_edges_in_a)[:5]}...")
        if self.missing_edges_in_b:
            lines.append(f"  Edges missing in B: {list(self.missing_edges_in_b)[:5]}...")
        return "\n".join(lines)


def extract_edges_from_causeway_json(causeway_json: dict) -> Tuple[Set[str], Set[Tuple[str, str]]]:
    """
    Extract nodes and edges from Causeway JSON format.

    Returns:
        (set of node ids, set of (source, target) edge tuples)
    """
    nodes = {n["id"] for n in causeway_json.get("nodes", [])}
    edges = {(e["source"], e["target"]) for e in causeway_json.get("edges", [])}
    return nodes, edges


def extract_edges_from_whyzen_model(model) -> Tuple[Set[str], Set[Tuple[str, str]]]:
    """
    Extract nodes and edges from a Whyzen StructuralCausalModel.

    The model must have been executed (forward() called) so nodes exist as attributes.

    Returns:
        (set of node names, set of (source, target) edge tuples)
    """
    nodes = set()
    edges = set()

    # Build a map of tensor id -> node name for matching
    tensor_to_node: Dict[int, str] = {}

    # First pass: collect all nodes and their tensor values
    for attr_name in dir(model):
        if attr_name.startswith('_'):
            continue
        attr = getattr(model, attr_name, None)
        if hasattr(attr, 'name') and hasattr(attr, '_value'):
            node_name = attr.name
            nodes.add(node_name)

            # Map tensor to node name (use data_ptr if available)
            value = attr._value
            if hasattr(value, 'data_ptr'):
                tensor_to_node[value.data_ptr()] = node_name
            else:
                tensor_to_node[id(value)] = node_name

    # Second pass: extract edges from mechanism_inputs
    for attr_name in dir(model):
        if attr_name.startswith('_'):
            continue
        attr = getattr(model, attr_name, None)
        if hasattr(attr, 'name') and hasattr(attr, 'mechanism_inputs'):
            target_name = attr.name
            mechanism_inputs = attr.mechanism_inputs

            if mechanism_inputs:
                for input_tensor in mechanism_inputs.values():
                    # Try to match tensor to parent node
                    if hasattr(input_tensor, 'data_ptr'):
                        ptr = input_tensor.data_ptr()
                        if ptr in tensor_to_node:
                            parent_name = tensor_to_node[ptr]
                            if parent_name != target_name:
                                edges.add((parent_name, target_name))
                    else:
                        # Fallback to id matching
                        tid = id(input_tensor)
                        if tid in tensor_to_node:
                            parent_name = tensor_to_node[tid]
                            if parent_name != target_name:
                                edges.add((parent_name, target_name))

    return nodes, edges


def compare_topologies(
    nodes_a: Set[str],
    edges_a: Set[Tuple[str, str]],
    nodes_b: Set[str],
    edges_b: Set[Tuple[str, str]]
) -> TopologyReport:
    """
    Compare two graph topologies.

    Returns:
        TopologyReport with detailed comparison results
    """
    missing_nodes_in_a = nodes_b - nodes_a
    missing_nodes_in_b = nodes_a - nodes_b
    missing_edges_in_a = edges_b - edges_a
    missing_edges_in_b = edges_a - edges_b

    is_valid = (
        len(missing_nodes_in_a) == 0 and
        len(missing_nodes_in_b) == 0 and
        len(missing_edges_in_a) == 0 and
        len(missing_edges_in_b) == 0
    )

    return TopologyReport(
        is_valid=is_valid,
        node_count_match=len(nodes_a) == len(nodes_b),
        edge_count_match=len(edges_a) == len(edges_b),
        missing_nodes_in_a=missing_nodes_in_a,
        missing_nodes_in_b=missing_nodes_in_b,
        missing_edges_in_a=missing_edges_in_a,
        missing_edges_in_b=missing_edges_in_b
    )


def validate_topology(
    whyzen_model,
    causeway_json: dict,
    raise_on_mismatch: bool = True
) -> TopologyReport:
    """
    Validate that a Whyzen model and Causeway JSON have the same topology.

    Args:
        whyzen_model: A Whyzen StructuralCausalModel (after forward() called)
        causeway_json: Causeway graph in JSON format
        raise_on_mismatch: If True, raise TopologyMismatch on failure

    Returns:
        TopologyReport

    Raises:
        TopologyMismatch if raise_on_mismatch=True and topologies differ
    """
    whyzen_nodes, whyzen_edges = extract_edges_from_whyzen_model(whyzen_model)
    causeway_nodes, causeway_edges = extract_edges_from_causeway_json(causeway_json)

    report = compare_topologies(
        whyzen_nodes, whyzen_edges,
        causeway_nodes, causeway_edges
    )

    if not report.is_valid and raise_on_mismatch:
        raise TopologyMismatch(str(report))

    return report


def validate_topology_from_files(
    causeway_json_path_a: str,
    causeway_json_path_b: str,
    raise_on_mismatch: bool = True
) -> TopologyReport:
    """
    Compare topologies of two Causeway JSON files.

    Useful for round-trip validation: Whyzen → Causeway → back → compare
    """
    with open(causeway_json_path_a) as f:
        json_a = json.load(f)
    with open(causeway_json_path_b) as f:
        json_b = json.load(f)

    nodes_a, edges_a = extract_edges_from_causeway_json(json_a)
    nodes_b, edges_b = extract_edges_from_causeway_json(json_b)

    report = compare_topologies(nodes_a, edges_a, nodes_b, edges_b)

    if not report.is_valid and raise_on_mismatch:
        raise TopologyMismatch(str(report))

    return report


def validate_parsed_edges(
    parsed_edges: Dict[str, List[str]],
    causeway_json: dict,
    raise_on_mismatch: bool = True
) -> TopologyReport:
    """
    Validate parsed edges (from source code) against Causeway JSON.

    Args:
        parsed_edges: Dict mapping node_name -> [parent_names]
        causeway_json: Causeway graph JSON

    Returns:
        TopologyReport
    """
    # Convert parsed edges to (source, target) tuples
    parsed_node_names = set(parsed_edges.keys())
    parsed_edge_tuples = set()
    for target, parents in parsed_edges.items():
        for parent in parents:
            parsed_edge_tuples.add((parent, target))

    causeway_nodes, causeway_edges = extract_edges_from_causeway_json(causeway_json)

    report = compare_topologies(
        parsed_node_names, parsed_edge_tuples,
        causeway_nodes, causeway_edges
    )

    if not report.is_valid and raise_on_mismatch:
        raise TopologyMismatch(str(report))

    return report


# Quick validation function for use in imports
def quick_validate(causeway_json: dict) -> bool:
    """
    Quick sanity check that a Causeway JSON is internally consistent.

    Checks:
    - All edge sources exist as nodes
    - All edge targets exist as nodes
    - No self-loops
    - No duplicate edges

    Returns:
        True if valid, raises ValueError otherwise
    """
    node_ids = {n["id"] for n in causeway_json.get("nodes", [])}
    edges = causeway_json.get("edges", [])

    seen_edges = set()
    for edge in edges:
        source, target = edge["source"], edge["target"]

        if source not in node_ids:
            raise ValueError(f"Edge source '{source}' not in nodes")
        if target not in node_ids:
            raise ValueError(f"Edge target '{target}' not in nodes")
        if source == target:
            raise ValueError(f"Self-loop detected: {source}")

        edge_tuple = (source, target)
        if edge_tuple in seen_edges:
            raise ValueError(f"Duplicate edge: {source} -> {target}")
        seen_edges.add(edge_tuple)

    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate graph topology")
    parser.add_argument("file_a", help="First Causeway JSON file")
    parser.add_argument("file_b", nargs="?", help="Second Causeway JSON file (optional)")

    args = parser.parse_args()

    if args.file_b:
        # Compare two files
        report = validate_topology_from_files(args.file_a, args.file_b, raise_on_mismatch=False)
        print(report)
    else:
        # Quick validate single file
        with open(args.file_a) as f:
            data = json.load(f)
        try:
            quick_validate(data)
            print(f"✓ {args.file_a} is internally consistent")
            nodes, edges = extract_edges_from_causeway_json(data)
            print(f"  {len(nodes)} nodes, {len(edges)} edges")
        except ValueError as e:
            print(f"✗ {args.file_a}: {e}")
