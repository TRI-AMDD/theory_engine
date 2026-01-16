"""
Parse RDE Model Source Code → Causeway JSON

This script parses the Whyzen-RDE model.py source code directly to extract
the causal graph structure. This is more reliable than runtime inspection
because it captures all node dependencies from mechanism_kwargs.

Usage:
    python parse_rde_model.py --input /path/to/model.py --output rde_graph.json
"""

import re
import json
import argparse
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict


@dataclass
class NodeInfo:
    name: str
    display_name: str
    node_type: str  # RootNode, Node, DeterministicNode, DeterministicRootNode
    mechanism_type: Optional[str]
    kernel_type: Optional[str]
    kernel_params: Dict[str, str]
    parents: List[str]  # Names of parent nodes from mechanism_kwargs
    level: str  # global, experiment, timepoint
    description: str


def snake_to_title(name: str) -> str:
    """Convert snake_case to Title Case."""
    words = name.replace('_', ' ').split()
    return ' '.join(word.capitalize() for word in words)


# Guess descriptions based on mechanism type
MECHANISM_GUESSES = {
    "SummationMechanism": "GUESS: Additive combination of parent factors",
    "ProductMechanism": "GUESS: Multiplicative combination of parent factors",
    "DivisionMechanism": "GUESS: Ratio or normalized quantity derived from parents",
    "LinearMechanism": "GUESS: Scaled/proportional relationship to parent",
    "IdentityMechanism": "GUESS: Direct pass-through from parent node",
    "SigmoidMechanism": "GUESS: Bounded/saturating response to input",
    "MolecularWeightMechanism": "Molecular weight calculated from chemical composition",
    "SiteDensityMechanism": "Reactive site density per unit area, from MW and surface area",
    "OverpotentialMechanism": "Electrochemical driving force = applied potential - reference",
    "VolcanoMechanism": "Catalytic activity from Sabatier principle (binding energy → turnover frequency)",
    "ExchangeCurrentDensityMechanism": "Intrinsic catalytic activity from turnover frequency and site count",
    "ButlerVolmerMechanism": "Kinetic current from exponential activation (Butler-Volmer kinetics)",
    "LevichMechanism": "Mass-transport limited current at rotating disk electrode",
    "KouteckyLevichMechanism": "Total current combining kinetic and diffusion limitations",
}

# Guess descriptions based on kernel type
KERNEL_GUESSES = {
    "NormalProbabilityKernel": "GUESS: Gaussian measurement noise (can be negative)",
    "FoldedNormalProbabilityKernel": "GUESS: Gaussian noise, folded to ensure positive values",
    "FoldedRelativeNormalProbabilityKernel": "GUESS: Proportional uncertainty (e.g., ±X% error)",
    "RelativeNormalProbabilityKernel": "GUESS: Proportional uncertainty, allows negative",
    "LogNormalProbabilityKernel": "GUESS: Multiplicative/order-of-magnitude uncertainty",
    "GammaProbabilityKernel": "GUESS: Right-skewed positive uncertainty",
    "UniformProbabilityKernel": "GUESS: Bounded range, all values equally likely",
    "BetaProbabilityKernel": "GUESS: Uncertainty for fraction/probability (0-1)",
}

# Root node guesses based on name patterns
ROOT_NODE_GUESSES = {
    "temperature": "Thermodynamic temperature of the system",
    "potential": "Applied electrical potential",
    "pressure": "System pressure",
    "concentration": "Species concentration in solution/gas",
    "loading": "Amount of material deposited per unit area",
    "density": "Mass or number per unit volume",
    "area": "Surface or geometric area",
    "rate": "Speed of process or reaction",
    "coefficient": "Dimensionless parameter relating quantities",
    "thickness": "Layer or film thickness",
    "diffusivity": "Diffusion coefficient - how fast species moves",
    "viscosity": "Fluid resistance to flow",
    "capacitance": "Charge storage capacity",
}


def generate_guess_description(node_name: str, node_type: str, mechanism_type: str, kernel_type: str, parents: List[str]) -> str:
    """Generate a GUESS description based on node properties."""
    parts = []

    # For root nodes, try to guess from name
    if node_type in ('RootNode', 'DeterministicRootNode'):
        name_lower = node_name.lower()
        for pattern, desc in ROOT_NODE_GUESSES.items():
            if pattern in name_lower:
                parts.append(f"GUESS: {desc}")
                break
        if not parts:
            parts.append("GUESS: Input parameter or constant")

    # For derived nodes, use mechanism info
    elif mechanism_type:
        if mechanism_type in MECHANISM_GUESSES:
            desc = MECHANISM_GUESSES[mechanism_type]
            parts.append(desc if desc.startswith("GUESS:") or not desc.startswith("GUESS") else desc)
        else:
            parts.append(f"GUESS: Computed via {mechanism_type}")

    # Add kernel uncertainty info
    if kernel_type and kernel_type in KERNEL_GUESSES:
        parts.append(KERNEL_GUESSES[kernel_type])

    # Add parent info for context
    if parents:
        parent_str = ", ".join(parents[:3])
        if len(parents) > 3:
            parent_str += f" (+{len(parents)-3} more)"
        parts.append(f"Depends on: {parent_str}")

    return " | ".join(parts) if parts else "GUESS: Unknown relationship"


def clean_html_mapping(html: str) -> str:
    """Clean HTML from DEFAULT_MAPPINGS to readable text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html)
    # Convert HTML entities
    text = text.replace('&eta;', 'η')
    text = text.replace('&omega;', 'ω')
    text = text.replace('&alpha;', 'α')
    text = text.replace('&phi;', 'φ')
    text = text.replace('&rho;', 'ρ')
    text = text.replace('&delta;', 'δ')
    text = text.replace('&Gamma;', 'Γ')
    text = text.replace('&Delta;', 'Δ')
    text = text.replace('&#402;', 'ƒ')
    text = text.replace('&nu;', 'ν')
    return text.strip()


def parse_mechanism_kwargs(kwargs_str: str) -> List[str]:
    """
    Extract parent node references from mechanism_kwargs dict string.

    Returns list of node names that are referenced as self.node_name
    """
    parents = []

    # Pattern to match self.node_name references
    # Handles: "key": self.node_name and "key": self.node_name,
    pattern = r'["\']?\w+["\']?\s*:\s*self\.(\w+)'

    for match in re.finditer(pattern, kwargs_str):
        parent_name = match.group(1)
        parents.append(parent_name)

    return parents


def parse_model_source(source: str) -> Tuple[List[NodeInfo], Dict[str, str]]:
    """
    Parse the RDE model source code to extract nodes and their dependencies.

    Returns:
        - List of NodeInfo objects
        - Dict mapping node names to display names from DEFAULT_MAPPINGS
    """
    nodes: List[NodeInfo] = []

    # Extract DEFAULT_MAPPINGS
    mappings = {}
    mappings_match = re.search(r'DEFAULT_MAPPINGS\s*=\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}', source, re.DOTALL)
    if mappings_match:
        mappings_content = mappings_match.group(1)
        for match in re.finditer(r'["\'](\w+)["\']\s*:\s*["\']([^"\']+)["\']', mappings_content):
            node_name = match.group(1)
            html_name = match.group(2)
            mappings[node_name] = clean_html_mapping(html_name)

    # Determine current sampling level based on method
    current_level = 'global'

    # Split by method definitions to track level
    method_sections = re.split(r'def (_sample_\w+)\(', source)

    for i in range(1, len(method_sections), 2):
        method_name = method_sections[i]
        method_body = method_sections[i + 1] if i + 1 < len(method_sections) else ''

        # Determine level from method name
        if 'global' in method_name:
            current_level = 'global'
        elif 'experiment' in method_name:
            current_level = 'experiment'
        elif 'timepoint' in method_name:
            current_level = 'timepoint'
        elif 'catalyst' in method_name or 'support' in method_name or 'device' in method_name or 'material' in method_name:
            # These inherit from parent level context
            pass

        # Find all node definitions in this section
        # Pattern for: self.node_name = NodeType(...)
        node_pattern = r'self\.(\w+)\s*=\s*(RootNode|Node|DeterministicNode|DeterministicRootNode)\s*\('

        for match in re.finditer(node_pattern, method_body):
            node_name = match.group(1)
            node_type = match.group(2)

            # Find the full node definition (balanced parens)
            start = match.end()
            paren_count = 1
            end = start
            while paren_count > 0 and end < len(method_body):
                if method_body[end] == '(':
                    paren_count += 1
                elif method_body[end] == ')':
                    paren_count -= 1
                end += 1

            node_def = method_body[start:end-1]

            # Extract mechanism
            mechanism_match = re.search(r'mechanism\s*=\s*(\w+)\s*\(', node_def)
            mechanism_type = mechanism_match.group(1) if mechanism_match else None

            # For RootNode, mechanism might be just a variable
            if not mechanism_type and 'mechanism=' in node_def:
                mechanism_match = re.search(r'mechanism\s*=\s*(\w+)', node_def)
                mechanism_type = mechanism_match.group(1) if mechanism_match else None

            # Extract kernel
            kernel_match = re.search(r'kernel\s*=\s*(\w+)\s*\(', node_def)
            kernel_type = kernel_match.group(1) if kernel_match else None

            # Extract kernel parameters
            kernel_params = {}
            if kernel_type:
                kernel_def_match = re.search(rf'{kernel_type}\s*\(([^)]+)\)', node_def)
                if kernel_def_match:
                    kernel_args = kernel_def_match.group(1)
                    for param_match in re.finditer(r'(\w+)\s*=\s*([^,\)]+)', kernel_args):
                        kernel_params[param_match.group(1)] = param_match.group(2).strip()

            # Extract parents from mechanism_kwargs
            parents = []
            kwargs_match = re.search(r'mechanism_kwargs\s*=\s*\{([^}]+)\}', node_def, re.DOTALL)
            if kwargs_match:
                parents = parse_mechanism_kwargs(kwargs_match.group(1))

            # Get display name
            display_name = mappings.get(node_name, snake_to_title(node_name))

            # Build description with GUESS markers
            guess_description = generate_guess_description(
                node_name, node_type, mechanism_type, kernel_type, parents
            )

            # Also include technical details
            tech_parts = []
            if mechanism_type:
                tech_parts.append(f"Mechanism: {mechanism_type}")
            if kernel_type:
                tech_parts.append(f"Kernel: {kernel_type}")
            if kernel_params:
                params_str = ', '.join(f"{k}={v}" for k, v in kernel_params.items())
                tech_parts.append(f"Params: {params_str}")

            full_description = guess_description
            if tech_parts:
                full_description += " || " + '. '.join(tech_parts)

            node_info = NodeInfo(
                name=node_name,
                display_name=display_name,
                node_type=node_type,
                mechanism_type=mechanism_type,
                kernel_type=kernel_type,
                kernel_params=kernel_params,
                parents=parents,
                level=current_level,
                description=full_description
            )
            nodes.append(node_info)

    return nodes, mappings


def to_causeway_json(nodes: List[NodeInfo], context: str = "") -> dict:
    """Convert parsed nodes to Causeway JSON format."""

    causeway_nodes = []
    causeway_edges = []

    for node in nodes:
        causeway_nodes.append({
            "id": node.name,
            "variableName": node.name,
            "displayName": node.display_name,
            "description": node.description,
            "position": {"x": 0, "y": 0},
            "_whyzen": {
                "node_type": node.node_type,
                "mechanism_type": node.mechanism_type,
                "kernel_type": node.kernel_type,
                "kernel_params": node.kernel_params,
                "level": node.level
            }
        })

        # Create edges from parents
        for parent_name in node.parents:
            edge_id = f"{parent_name}->{node.name}"
            causeway_edges.append({
                "id": edge_id,
                "source": parent_name,
                "target": node.name
            })

    return {
        "nodes": causeway_nodes,
        "edges": causeway_edges,
        "experimentalContext": context
    }


def main():
    parser = argparse.ArgumentParser(
        description='Parse Whyzen RDE model source to Causeway JSON'
    )
    parser.add_argument(
        '--input', '-i',
        required=True,
        help='Path to model.py source file'
    )
    parser.add_argument(
        '--output', '-o',
        default='rde_causeway_graph.json',
        help='Output JSON file path'
    )

    args = parser.parse_args()

    print(f"Reading source file: {args.input}")
    with open(args.input, 'r') as f:
        source = f.read()

    print("Parsing model structure...")
    nodes, mappings = parse_model_source(source)

    print(f"Found {len(nodes)} nodes")

    # Count edges
    edge_count = sum(len(n.parents) for n in nodes)
    print(f"Found {edge_count} edges")

    # Build context from docstring
    context_match = re.search(r'class RdeModel.*?"""([^"]+)"""', source, re.DOTALL)
    context = context_match.group(1).strip() if context_match else ""

    # Convert to Causeway format
    json_data = to_causeway_json(nodes, context)

    # Write output
    with open(args.output, 'w') as f:
        json.dump(json_data, f, indent=2)

    print(f"Wrote graph to {args.output}")

    # Print summary
    print("\nNode summary by level:")
    levels = {}
    for node in nodes:
        levels.setdefault(node.level, []).append(node.name)
    for level, names in levels.items():
        print(f"  {level}: {len(names)} nodes")


if __name__ == '__main__':
    main()
