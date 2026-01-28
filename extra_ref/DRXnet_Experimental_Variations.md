# DRXNet Dataset: Experimental Variables

This document catalogs **everything that was varied** in the experimental conditions of the DRXNet dataset.

---

## 1. COMPOSITION VARIABLES

### 1.1 Lithium Content
- **Parameter:** Li stoichiometry (x in Liₓ)
- **Range:** 1.0 - 1.333
- **Common values:** 1.0, 1.05, 1.1, 1.15, 1.167, 1.19, 1.2, 1.24, 1.25, 1.28, 1.3, 1.333
- **Purpose:** Controls Li-excess for percolation network

### 1.2 Redox-Active Transition Metals
- **Elements:** Mn, Cr, V, Fe, Co, Ni
- **Range:** 0.1 - 0.833 (fractional stoichiometry)
- **Purpose:** Provide electrochemical capacity via redox reactions

| Element | Oxidation States | Role |
|---------|-----------------|------|
| Mn | 2+/4+ | Primary redox, earth-abundant |
| Cr | 3+/6+ | High-rate capability, TM migration |
| V | 3+/5+ | Low-voltage redox, TM migration |
| Fe | 2+/3+ | Earth-abundant alternative |
| Co | 2+/3+ | Redox capacity |
| Ni | 2+/4+ | High voltage redox |

### 1.3 Charge-Compensating (Inert) Transition Metals
- **Elements:** Ti, Zr, Nb, Mo
- **Range:** 0.033 - 0.6 (fractional stoichiometry)
- **Purpose:** Stabilize disordered structure, compensate Li-excess charge

| Element | Oxidation State | Role |
|---------|-----------------|------|
| Ti | 4+ | Most common stabilizer |
| Zr | 4+ | Structural stability |
| Nb | 5+ | Charge compensation |
| Mo | 6+ | Charge compensation |

### 1.4 Dopants
- **Elements:** Mg, Al
- **Range:** 0.05 - 0.1 (fractional stoichiometry)
- **Purpose:** Modify capacity, voltage, or cycling behavior

### 1.5 Anion Composition

**Oxygen (O):**
- **Range:** 0.667 - 2.0
- **Present in:** All compositions

**Fluorine (F):**
- **Range:** 0 - 1.333
- **Present in:** 151 compositions (oxyfluorides)
- **Purpose:**
  - Lower anion valence
  - Accommodate more Li-excess
  - Enhance surface stability
  - Modify short-range order

### 1.6 Number of Metal Species (Complexity)
- **2TM systems:** Two transition metals (e.g., Li-Ti-Mn-O)
- **3TM systems:** Three transition metals (e.g., Li-Ti-Mn-Cr-O)
- **High-entropy (HE) systems:** 4+ transition metals

---

## 2. ELECTROCHEMICAL TEST PARAMETERS

### 2.1 Current Density (C-rate)
- **Parameter:** `test_current(mA/g)`
- **Unit:** mA per gram of active material

| Rate (mA/g) | Approximate C-rate | Test Purpose |
|-------------|-------------------|--------------|
| 5 | ~C/60 | Ultra-low rate (near equilibrium) |
| 10 | ~C/30 | Low rate |
| **20** | ~C/15 | **Standard test rate (most common)** |
| 40 | ~C/7 | Moderate rate |
| 50 | ~C/6 | Moderate rate |
| 100 | ~C/3 | Moderate-high rate |
| 200 | ~C/1.5 | High rate |
| 400 | ~1C | High rate |
| 500 | ~1.2C | High rate |
| 1000 | ~2.5C | Very high rate |
| 2000 | ~5C | Extreme rate |
| 5000 | ~12C | Extreme rate |
| 10000 | ~25C | Extreme rate |
| 20000 | ~50C | Ultra-extreme rate |

### 2.2 Voltage Window

**Low Voltage Cutoff (Vlow):**
| Value (V) | Usage |
|-----------|-------|
| 1.0 | Extended low-voltage testing |
| **1.5** | **Most common** |
| 1.7 | Restricted window |
| 2.0 | Restricted window |
| 2.3 | High-voltage only |
| 2.5 | High-voltage only |

**High Voltage Cutoff (Vhigh):**
| Value (V) | Usage |
|-----------|-------|
| 4.0 | Conservative (electrolyte-safe) |
| 4.2 | Conservative |
| 4.3 | Moderate |
| 4.4 | Standard commercial range |
| 4.5 | Extended |
| 4.6 | Extended |
| **4.7** | **Common for DRX** |
| **4.8** | **Common for DRX** |
| 5.0 | Maximum (high-voltage stability tests) |

**Common Voltage Windows:**
- 1.5 - 4.7 V (most common)
- 1.5 - 4.8 V (common)
- 1.5 - 4.6 V
- 2.0 - 4.4 V (industry-standard range)
- 1.5 - 5.0 V (extended range)

### 2.3 Number of Cycles
- **Parameter:** `cycle_num` / `N` in filename
- **Range:** 1 - 891 cycles
- **Distribution:**
  - Most tests: 10-100 cycles
  - Some long-term tests: 100-500 cycles
  - Extended cycling studies: 500-891 cycles

---

## 3. ELECTRODE/CELL PARAMETERS

### 3.1 Electrode Mass
- **Parameter:** `electrode_mass(g)`
- **Typical range:** 0.0015 - 0.003 g
- **Composition:** DRX active material + Super C65 carbon black + PTFE binder

### 3.2 Active Material Mass
- **Parameter:** `active_mass(g)`
- **Typical range:** 0.001 - 0.002 g
- **Used for:** Normalizing capacity to mAh/g

### 3.3 Cell Configuration (Fixed)
- **Cell type:** CR2032 coin cell
- **Anode:** Li-metal foil (FMC)
- **Separator:** Glass microfiber filters (Whatman)
- **Electrolyte:** 1M LiPF6 in EC:DMC (1:1 v/v)

---

## 4. SUMMARY TABLE: ALL VARIED PARAMETERS

| Category | Parameter | Variation Range | # Unique Values |
|----------|-----------|-----------------|-----------------|
| **Composition** | Li content | 1.0 - 1.333 | ~12 |
| | Redox TM (Mn,Cr,V,Fe,Co,Ni) | 0 - 0.833 | Continuous |
| | Inert TM (Ti,Zr,Nb,Mo) | 0 - 0.6 | Continuous |
| | Dopants (Mg,Al) | 0 - 0.1 | Continuous |
| | O content | 0.667 - 2.0 | Continuous |
| | F content | 0 - 1.333 | Continuous |
| **Test Rate** | Current density | 5 - 20,000 mA/g | 14 |
| **Voltage** | Low cutoff | 1.0 - 2.5 V | 6 |
| | High cutoff | 4.0 - 5.0 V | 9 |
| **Cycling** | Number of cycles | 1 - 891 | Continuous |
| **Electrode** | Active mass | 0.001 - 0.002 g | Continuous |

---

## 5. WHAT WAS NOT VARIED (Constants)

The following parameters were held constant across the dataset:

- **Cell type:** CR2032 coin cell
- **Anode:** Li metal
- **Electrolyte composition:** 1M LiPF6 in EC:DMC (1:1)
- **Temperature:** Room temperature (~25°C)
- **Separator:** Whatman glass fiber
- **Electrode formulation:** Active + Super C65 + PTFE
- **Testing protocol:** Galvanostatic discharge
- **Crystal structure:** Disordered rocksalt (by design)

---

## 6. VISUAL SUMMARY

```
                    EXPERIMENTAL VARIABLES IN DRXNet DATASET
                    =========================================

    COMPOSITION                     TEST CONDITIONS              CYCLING
    ───────────                     ───────────────              ───────

    Li content (1.0-1.333)          Current rate (5-20000 mA/g)  Cycles (1-891)
         │                               │
         ├── Redox TM                    ├── Low voltage (1.0-2.5 V)
         │   ├── Mn (0-0.83)             │
         │   ├── Cr (0-0.3)              └── High voltage (4.0-5.0 V)
         │   ├── V (0-0.57)
         │   ├── Fe (0-0.67)
         │   ├── Co (0-0.3)
         │   └── Ni (0-0.67)
         │
         ├── Inert TM
         │   ├── Ti (0-0.6)
         │   ├── Zr (0-0.4)
         │   ├── Nb (0-0.4)
         │   └── Mo (0-0.3)
         │
         ├── Dopants
         │   ├── Mg (0-0.1)
         │   └── Al (0-0.1)
         │
         └── Anions
             ├── O (0.67-2.0)
             └── F (0-1.33)
```

---

## 7. KEY TAKEAWAYS

1. **Composition is the primary variable** - 15 elements with continuous stoichiometric variation
2. **Current density spans 4 orders of magnitude** - from 5 to 20,000 mA/g
3. **Voltage windows are diverse** - 19 different combinations tested
4. **Cycling depth varies significantly** - from single-cycle to 891 cycles
5. **Cell fabrication is standardized** - enabling fair comparison across compositions
