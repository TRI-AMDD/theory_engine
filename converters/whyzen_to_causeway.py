"""
Whyzen → Causeway Converter

Extracts graph structure from a Whyzen StructuralCausalModel and converts it
to Causeway's JSON format for visualization and exploration.

Usage:
    python whyzen_to_causeway.py --model whyzen_rde.model:RdeModel --output rde_graph.json

Or as a library:
    from whyzen_to_causeway import extract_causeway_graph
    graph = extract_causeway_graph(my_whyzen_model)
"""

import json
import argparse
import importlib
import re
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict


@dataclass
class CausalNode:
    id: str
    variableName: str
    displayName: str
    description: str
    position: Optional[Dict[str, float]] = None
    # Whyzen-specific metadata (for round-trip)
    whyzen_metadata: Optional[Dict[str, Any]] = None


@dataclass
class CausalEdge:
    id: str
    source: str
    target: str


@dataclass
class CausalGraph:
    nodes: List[CausalNode]
    edges: List[CausalEdge]
    experimentalContext: str


def snake_to_title(name: str) -> str:
    """Convert snake_case to Title Case display name."""
    words = name.replace('_', ' ').split()
    return ' '.join(word.capitalize() for word in words)


def get_mechanism_description(node) -> str:
    """Extract a description from the node's mechanism."""
    mechanism = getattr(node, 'mechanism', None)
    if mechanism is None:
        return ""

    # Try to get mechanism class name
    mech_name = type(mechanism).__name__

    # Try to get docstring
    doc = getattr(mechanism, '__doc__', '') or ''
    if doc:
        # Take first line of docstring
        doc = doc.strip().split('\n')[0]

    # Build description
    parts = []
    if mech_name and mech_name != 'Mechanism':
        parts.append(f"Mechanism: {mech_name}")
    if doc:
        parts.append(doc)

    return '. '.join(parts) if parts else ""


def get_kernel_info(node) -> Dict[str, Any]:
    """Extract kernel information for metadata."""
    kernel = getattr(node, 'kernel', None)
    if kernel is None:
        return {"type": "deterministic"}

    kernel_name = type(kernel).__name__

    # Try to extract kernel parameters
    params = {}
    for attr in ['std', 'relative_std', 'var_frac', 'log_base']:
        if hasattr(kernel, attr):
            val = getattr(kernel, attr)
            if hasattr(val, 'item'):
                val = val.item()
            params[attr] = val

    return {
        "type": kernel_name,
        "params": params
    }


def extract_node_dependencies(node) -> List[str]:
    """Extract parent node names from mechanism_inputs."""
    mechanism_inputs = getattr(node, 'mechanism_inputs', {})

    # mechanism_inputs maps input_name -> tensor
    # But we need to trace back to the original node names
    # This is tricky because tensors lose their node reference

    # Alternative: look at the mechanism_kwargs that were passed during construction
    # These are stored differently in different Whyzen versions

    parent_names = []

    # Try to get the original kwargs if stored
    if hasattr(node, '_mechanism_kwargs_nodes'):
        for name, parent in node._mechanism_kwargs_nodes.items():
            if hasattr(parent, 'name'):
                parent_names.append(parent.name)

    return parent_names


def extract_graph_from_model(model, **forward_kwargs) -> CausalGraph:
    """
    Extract CausalGraph from a Whyzen StructuralCausalModel.

    Args:
        model: An instance of StructuralCausalModel
        **forward_kwargs: Arguments to pass to model.forward()

    Returns:
        CausalGraph with nodes and edges
    """
    # Run the model to create nodes
    # Whyzen uses effect handlers to trace node creation
    nodes_list = model.get_nodes(**forward_kwargs)

    nodes: List[CausalNode] = []
    edges: List[CausalEdge] = []
    node_names: Set[str] = set()

    for node in nodes_list:
        name = node.name
        node_names.add(name)

        # Build metadata
        metadata = {
            "node_type": type(node).__name__,
            "mechanism_type": type(getattr(node, 'mechanism', None)).__name__,
            "kernel": get_kernel_info(node),
        }

        causal_node = CausalNode(
            id=name,
            variableName=name,
            displayName=snake_to_title(name),
            description=get_mechanism_description(node),
            whyzen_metadata=metadata
        )
        nodes.append(causal_node)

    # Extract edges from node dependencies
    # We need to trace the actual node references in mechanism_kwargs
    # This requires inspecting the model's forward() execution

    # Alternative approach: parse the model source or use a custom tracer
    # For now, we'll use a simpler heuristic based on model attributes

    for node in nodes_list:
        target_name = node.name

        # Get parent nodes from mechanism_inputs
        mechanism_inputs = getattr(node, 'mechanism_inputs', {})

        # The model stores node references as attributes
        # We can match tensor values to find parents
        for attr_name in dir(model):
            if attr_name.startswith('_'):
                continue
            attr = getattr(model, attr_name, None)
            if hasattr(attr, 'name') and hasattr(attr, '_value'):
                # This is a node
                parent_name = attr.name
                if parent_name in node_names and parent_name != target_name:
                    # Check if this node's value appears in mechanism_inputs
                    parent_value = getattr(attr, '_value', None)
                    if parent_value is not None:
                        for input_val in mechanism_inputs.values():
                            if parent_value is input_val or (
                                hasattr(parent_value, 'data_ptr') and
                                hasattr(input_val, 'data_ptr') and
                                parent_value.data_ptr() == input_val.data_ptr()
                            ):
                                edge_id = f"{parent_name}->{target_name}"
                                edge = CausalEdge(
                                    id=edge_id,
                                    source=parent_name,
                                    target=target_name
                                )
                                if edge not in edges:
                                    edges.append(edge)

    # Get experimental context from model docstring
    context = getattr(model, '__doc__', '') or ''
    context = context.strip()

    return CausalGraph(
        nodes=nodes,
        edges=edges,
        experimentalContext=context
    )


def extract_edges_from_source(model_class) -> List[tuple]:
    """
    Parse model source code to extract edges from mechanism_kwargs.

    This is a fallback method that parses the Python source to find
    node dependencies when runtime inspection fails.
    """
    import inspect

    try:
        source = inspect.getsource(model_class)
    except (TypeError, OSError):
        return []

    edges = []

    # Pattern to match Node/DeterministicNode creation with mechanism_kwargs
    # This is a simplified parser - may not catch all cases
    node_pattern = r'(\w+)\s*=\s*(?:Root)?(?:Deterministic)?Node\s*\('
    kwargs_pattern = r'mechanism_kwargs\s*=\s*\{([^}]+)\}'

    # Find all node definitions
    node_matches = list(re.finditer(node_pattern, source))

    for match in node_matches:
        target_name = match.group(1)
        # Look for mechanism_kwargs after this match
        remaining = source[match.end():]
        kwargs_match = re.search(kwargs_pattern, remaining[:500])  # Limit search

        if kwargs_match:
            kwargs_content = kwargs_match.group(1)
            # Extract references like "self.some_node" or "some_node"
            refs = re.findall(r'(?:self\.)?(\w+)', kwargs_content)
            for ref in refs:
                if ref not in ['self', target_name] and not ref.startswith(('torch', 'np')):
                    edges.append((ref, target_name))

    return edges


def to_causeway_json(graph: CausalGraph) -> dict:
    """Convert CausalGraph to JSON-serializable dict."""
    return {
        "nodes": [
            {
                "id": n.id,
                "variableName": n.variableName,
                "displayName": n.displayName,
                "description": n.description,
                "position": n.position or {"x": 0, "y": 0},
                # Include metadata as separate field for round-trip
                "_whyzen": n.whyzen_metadata
            }
            for n in graph.nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source": e.source,
                "target": e.target
            }
            for e in graph.edges
        ],
        "experimentalContext": graph.experimentalContext
    }


def load_model(model_path: str):
    """
    Load a Whyzen model from a module path.

    Args:
        model_path: Path like "whyzen_rde.model:RdeModel"

    Returns:
        Instantiated model
    """
    module_path, class_name = model_path.split(':')
    module = importlib.import_module(module_path)
    model_class = getattr(module, class_name)
    return model_class()


def main():
    parser = argparse.ArgumentParser(
        description='Convert Whyzen StructuralCausalModel to Causeway JSON'
    )
    parser.add_argument(
        '--model', '-m',
        required=True,
        help='Model path like "whyzen_rde.model:RdeModel"'
    )
    parser.add_argument(
        '--output', '-o',
        default='causeway_graph.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--n-experiments', type=int, default=1,
        help='Number of experiments for model forward pass'
    )
    parser.add_argument(
        '--n-timepoints', type=int, default=1,
        help='Number of timepoints for model forward pass'
    )

    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    model = load_model(args.model)

    print("Extracting graph structure...")
    graph = extract_graph_from_model(
        model,
        n_experiments=args.n_experiments,
        n_timepoints=args.n_timepoints
    )

    print(f"Found {len(graph.nodes)} nodes and {len(graph.edges)} edges")

    # Convert to JSON
    json_data = to_causeway_json(graph)

    # Write output
    with open(args.output, 'w') as f:
        json.dump(json_data, f, indent=2)

    print(f"Wrote graph to {args.output}")


if __name__ == '__main__':
    main()
