# ARC Challenge Progress Report: Battery Degradation Theory Development

**Date:** 2026-01-28
**Project:** Causeway Theory Engine with Shoshin Integration
**Challenge:** Use agents to develop a theory of battery cycle life relating composition, structure, and processing information to degradation

---

## Challenge Definition

> The challenge for the ARC team is to use agents (or other tools) to develop a theory of battery cycle life relating composition, structure, and processing information to degradation. The theory should rationally connect trends in input factors to why batteries degrade and be relatable to degradation variation along compositional or structural axes. It is important to capture both the final theory (output) and the process of how agents work to develop it, as scientific theories can emerge from the use of agents.

---

## What We Built: Causeway Theory Engine

### Core Capability

A tool that enables **agent-assisted scientific hypothesis development** through:

1. **Causal Graph Construction** - Visual representation of causal relationships between battery variables (composition, structure, processing, degradation mechanisms)

2. **Node Classification System (I/O/D)**
   - **Intervenable (I):** Variables that can be manipulated (e.g., electrolyte composition, cathode structure)
   - **Observable (O):** Variables that can be measured (e.g., capacity fade, impedance growth)
   - **Desirable (D):** Target outcomes (e.g., cycle life, energy density retention)

3. **AI-Powered Hypothesis Generation**
   - LLM generates testable hypotheses connecting I → O → D
   - Each hypothesis includes:
     - Prescription (what to do)
     - Predictions (what will happen)
     - Causal story (mechanistic explanation)
     - Action hooks (how to validate)
     - Self-critique (limitations)

4. **Multi-Hypothesis Exploration**
   - Generate multiple diverse hypotheses (1-10)
   - Consolidate actions across hypotheses
   - Identify high-utility experiments that validate multiple hypotheses

5. **Action Space Visualization**
   - Bipartite graph: Hypotheses ↔ Actions
   - Visual identification of critical experiments
   - Utility scoring (actions serving multiple hypotheses)

### Shoshin Matlantis Integration (New: 2026-01-28)

Added computational chemistry capabilities directly into the workflow:

| Feature | Description |
|---------|-------------|
| **Matlantis MD Simulation** | Molecular dynamics at various temperatures |
| **Structure Optimization** | Geometry relaxation with PFP potential |
| **Diffusivity Analysis** | Ion transport from MD trajectories |
| **RDF Analysis** | Local structure characterization |
| **Thermal Conductivity** | Heat transport properties |
| **Elastic Properties** | Mechanical characterization |
| **NEB Calculations** | Reaction/diffusion barriers |
| **Phonon DOS** | Vibrational properties |
| **Ionic Conductivity** | Nernst-Einstein conductivity |
| **Batch Calculations** | High-throughput screening |

---

## Results & Current State

### Functional Components

| Component | Status | Description |
|-----------|--------|-------------|
| Theory Engine Panel | Complete | Node classification, hypothesis management |
| Causal Graph Canvas | Complete | Visual graph editing with React Flow |
| Hypothesis Generator | Complete | LLM-powered generation with diversity |
| Action Consolidation | Complete | Merge actions across hypotheses |
| Action Space Visualization | Complete | Bipartite hypothesis-action graph |
| Matlantis Executor | Complete | Execute computations from hypotheses |
| Matlantis Chat | Complete | Natural language computation interface |

### Data Flow

```
User defines experimental context
    ↓
Builds/imports causal graph (nodes = variables, edges = causal links)
    ↓
Classifies nodes as Intervenable/Observable/Desirable
    ↓
Defines action space (available experiments/computations)
    ↓
LLM generates hypotheses with action hooks
    ↓
Consolidate actions → identify high-utility experiments
    ↓
Execute actions (Matlantis, literature search, etc.)
    ↓
Results feed back → refine hypotheses
```

### Key Innovation: Process Capture

The system captures the **theory development process**:
- Hypotheses are versioned and tracked
- Actions link to specific hypotheses
- Modifications propagate bidirectionally
- Export includes full provenance

---

## Challenges Identified

### Technical Challenges

1. **LLM Consistency**
   - Hypothesis quality varies
   - Need better prompt engineering for battery-specific domain

2. **Action Consolidation Accuracy**
   - Merging parameters across hypotheses requires domain knowledge
   - Current approach is heuristic-based

3. **Result Integration**
   - Matlantis results need automated parsing
   - Feedback loop to update hypotheses not fully automated

4. **Scale**
   - Large causal graphs become unwieldy
   - Need hierarchical/modular graph support

### Domain Challenges

1. **Battery Knowledge Encoding**
   - Degradation mechanisms are complex and interconnected
   - Need pre-built causal templates for common battery chemistries

2. **Experimental Validation**
   - Simulated vs. experimental data integration
   - Uncertainty quantification not addressed

3. **Theory Formalization**
   - Current "theories" are natural language hypotheses
   - Need mathematical/quantitative formulation

---

## Progress Metrics

| Metric | Value |
|--------|-------|
| Core components implemented | 15+ |
| Action types supported | 18 (General + Matlantis) |
| Visualization modes | 2 (Causal, Action Space) |
| LLM integrations | 2 (Azure OpenAI, Ollama) |
| Commits this sprint | 3 |

---

## Next Steps

### Immediate (Next Week)

1. **Domain Templates**
   - Create battery degradation causal graph templates
   - Pre-populate with known mechanisms (SEI growth, Li plating, etc.)

2. **Result Parsing**
   - Automated extraction of key metrics from Matlantis results
   - Link results to hypothesis predictions

3. **Batch Workflow**
   - UI for managing structure libraries
   - Compositional screening support

### Medium-Term (Next Month)

4. **Quantitative Hypotheses**
   - Mathematical relationships in prescriptions
   - Prediction bounds with uncertainty

5. **Feedback Loop**
   - Automated hypothesis refinement from results
   - Confidence scoring

6. **Collaboration Features**
   - Multi-user hypothesis editing
   - Shared action queues

### Long-Term (Quarter)

7. **Active Learning Integration**
   - Suggest next experiments based on information gain
   - Bayesian optimization coupling

8. **Knowledge Base**
   - Persistent library of validated hypotheses
   - Cross-project learning

9. **Publication-Ready Export**
   - Generate theory documentation
   - Reproducibility artifacts

---

## Relevance to Challenge Goals

### "Theory should rationally connect trends in input factors to why batteries degrade"

**Addressed by:**
- Causal graph explicitly encodes I → mechanism → O relationships
- LLM generates mechanistic "stories" explaining causation
- Action hooks validate causal claims

### "Be relatable to degradation variation along compositional or structural axes"

**Addressed by:**
- Node classification allows marking compositional/structural variables
- Batch calculations enable systematic variation studies
- Action consolidation identifies axis-specific experiments

### "Capture both the final theory and the process"

**Addressed by:**
- Hypothesis versioning tracks evolution
- Action-hypothesis links preserve provenance
- Export includes full development history

---

## Files Modified/Created (2026-01-28)

| File | Action |
|------|--------|
| `src/types/index.ts` | Extended ActionType union |
| `src/utils/actionTypes.ts` | New: Action type definitions |
| `src/components/MatlantisExecutor.tsx` | New: Execution component |
| `src/components/MatlantisChat.tsx` | New: Chat interface |
| `src/components/ActionSpaceEditor.tsx` | Updated: Categorized dropdown |
| `src/components/ActionDetailPanel.tsx` | Updated: Matlantis integration |
| `src/components/ActionNode.tsx` | Updated: Color coding |
| `src/components/ActionSpaceCanvas.tsx` | Updated: React Flow fix |
| `src/components/GraphCanvas.tsx` | Updated: React Flow fix |
| `src/App.tsx` | Updated: Chat panel integration |

---

## Conclusion

The Causeway Theory Engine provides a foundation for agent-assisted theory development. The Shoshin integration adds computational chemistry capabilities needed for battery research. Key remaining work focuses on:

1. Domain-specific knowledge encoding
2. Quantitative hypothesis formulation
3. Automated feedback loops

The tool demonstrates that **scientific theories can emerge from structured agent workflows** when combining:
- Human domain expertise (graph construction, node classification)
- AI hypothesis generation (LLM-powered exploration)
- Computational validation (Matlantis simulations)
- Systematic organization (action consolidation, visualization)

---

**Repository:** `github.com/TRI-AMDD/theory_engine`
**Branch:** `hisa`
**Commit:** `3b1ceab`
