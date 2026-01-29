import { useState, useCallback } from 'react';
import type { Message, Feature, ExecutionConfig, StructureFile, ConversationState, ExecutionResult } from '../types';
import { features, batchFeatures } from '../data/features';
import { parseStructureFile, parseZipFile, parseStructureListWithDetails } from '../utils/structureParser';

const OLLAMA_URL = '/api/ollama/generate';
const EXECUTE_WS_URL = 'ws://localhost:8081/ws/execute';
const UPLOAD_URL = 'http://localhost:8081/upload';

// ARC project path - update this for your environment
const ARC_PATH = '/Users/hisatsuguyamasaki/Projects/theory_engine/ARC';
const PYTHON_CMD = `${ARC_PATH}/venv/bin/python`;  // Use venv python

const SYSTEM_PROMPT_ASK_ACTION = `You are Shoshin Assistant for Matlantis computational materials science simulations.

The user has provided a structure file. Now ask what they want to do with it.

RULES:
- BE DECISIVE. Do NOT ask multiple questions.
- When user states their intent, propose ALL parameters with their values.
- Ask user to confirm the parameters before execution.
- RESPOND IN THE SAME LANGUAGE AS THE USER.

Available features:
- md-simulation: MD simulations (params: temperature, steps, timestep, ensemble)
- structure-optimization: Optimize structure (params: fmax, optimize_cell)
- diffusivity-analysis: Calculate diffusion coefficient (params: species, temperature)
- rdf-analysis: Calculate RDF (params: species1, species2, r_max)
- thermal-conductivity: Calculate thermal conductivity (params: temperature)
- elastic-properties: Calculate elastic constants (params: strain)
- reaction-path: NEB calculation (params: n_images, fmax, method)
- surface-generation: Generate surface slab (params: miller_h/k/l, layers, vacuum)
- molecule-generation: Generate molecule from SMILES (params: smiles, name, optimize)
- ionic-conductivity: Calculate ionic conductivity (params: species, temperature, charge)
- phonon-dos: Calculate phonon DOS (params: supercell_x/y/z, displacement)
- viscosity: Calculate viscosity (params: temperature, method)

When user states what they want, propose parameters and ask for confirmation:
\`\`\`json
{"feature": "feature-id", "parameters": {...}, "status": "propose"}
\`\`\`

EXAMPLES:
User: "MDシミュレーションをしたい"
Response: "了解しました。MDシミュレーションのパラメータを提案します。

【パラメータ】
* 温度 (temperature): 300 K
* ステップ数 (steps): 1000
* タイムステップ (timestep): 1.0 fs
* アンサンブル (ensemble): NVT

このパラメータでよろしいですか？
変更したい場合は「temperature: 500」のように指定してください。
\`\`\`json
{"feature": "md-simulation", "parameters": {"temperature": 300, "steps": 1000, "timestep": 1.0, "ensemble": "NVT"}, "status": "propose"}
\`\`\`"`;

const SYSTEM_PROMPT_PARAM_CONFIRM = `You are Shoshin Assistant. The user is reviewing calculation parameters.

Current feature: {feature}
Current parameters: {parameters}

RULES:
- If user says OK/yes/はい/よろしい/実行/これでいい, respond with status "confirmed"
- If user specifies parameter changes (e.g., "temperature: 500"), update parameters and show ALL parameters again with status "propose"
- RESPOND IN THE SAME LANGUAGE AS THE USER
- Always show ALL parameters, not just the changed ones

For confirmation:
\`\`\`json
{"feature": "feature-id", "parameters": {...}, "status": "confirmed"}
\`\`\`

For parameter update (show updated values):
\`\`\`json
{"feature": "feature-id", "parameters": {...}, "status": "propose"}
\`\`\``;

function generateCommand(featureId: string, params: Record<string, string | number>, structurePath: string): string {
  switch (featureId) {
    case 'md-simulation': {
      const temp = params.temperature || 300;
      const steps = params.steps || 1000;
      const timestep = params.timestep || 1.0;
      const ensemble = params.ensemble || 'NVT';
      const totalTime = (Number(steps) * Number(timestep) / 1000).toFixed(3);
      // Prompt format that the script parses: "at XXXK using ENSEMBLE for X.XX ps at X fs timestep"
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_md_from_prompt_on_matlantis.py \\
  'MD at ${temp}K using ${ensemble} for ${totalTime} ps at ${timestep} fs timestep' \\
  --structure "${structurePath}" \\
  --output-dir "./md_results"`;
    }

    case 'structure-optimization': {
      const fmax = params.fmax || 0.05;
      const optimizeCell = params.optimize_cell === 'yes';
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_optimization_on_matlantis.py \\
  'Optimize structure' \\
  --structure "${structurePath}" \\
  --fmax ${fmax}${optimizeCell ? ' \\\n  --optimize-cell' : ''} \\
  --output-dir "./opt_results"`;
    }

    case 'diffusivity-analysis':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_diffusivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species ${params.species || 'Li'} \\
  --temperature ${params.temperature || 300}`;

    case 'rdf-analysis':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_rdf.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species1 ${params.species1 || 'O'} \\
  --species2 ${params.species2 || 'H'} \\
  --r-max ${params.r_max || 8.0}`;

    case 'thermal-conductivity':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_thermal_conductivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --temperature ${params.temperature || 300}`;

    case 'elastic-properties':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_elastic.py \\
  "${structurePath}" \\
  --strain ${params.strain || 0.01}`;

    case 'reaction-path':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_neb.py \\
  --initial "${params.initial_structure || structurePath}" \\
  --final "${params.final_structure || 'final.cif'}" \\
  --n-images ${params.n_images || 7} \\
  --fmax ${params.fmax || 0.05} \\
  --method ${params.method || 'NEB'}`;

    case 'surface-generation':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/generate_surface.py \\
  "${structurePath}" \\
  --miller ${params.miller_h || 1} ${params.miller_k || 1} ${params.miller_l || 1} \\
  --layers ${params.layers || 4} \\
  --vacuum ${params.vacuum || 15.0}`;

    case 'molecule-generation':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/generate_molecule.py \\
  --smiles "${params.smiles || ''}" \\
  --name "${params.name || ''}" \\
  --output "${params.output || 'molecule.xyz'}"${params.optimize === 'yes' ? ' \\\n  --optimize' : ''}`;

    case 'ionic-conductivity':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_ionic_conductivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species ${params.species || 'Li'} \\
  --temperature ${params.temperature || 300} \\
  --charge ${params.charge || 1}`;

    case 'phonon-dos':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_phonon_dos.py \\
  "${structurePath}" \\
  --supercell ${params.supercell_x || 2} ${params.supercell_y || 2} ${params.supercell_z || 2} \\
  --displacement ${params.displacement || 0.01}`;

    case 'viscosity':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_viscosity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --temperature ${params.temperature || 300} \\
  --method ${params.method || 'Green-Kubo'}`;

    // Batch features
    case 'batch-optimization':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_optimization.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_opt_results'}" \\
  --fmax ${params.fmax || 0.05}${params.optimize_cell === 'yes' ? ' \\\n  --optimize-cell' : ''}`;

    case 'batch-md':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_md.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_md_results'}" \\
  --temperature ${params.temperature || 300} \\
  --steps ${params.steps || 1000} \\
  --ensemble ${params.ensemble || 'NVT'}`;

    case 'batch-diffusivity': {
      const temps = String(params.temperatures || '300,500,700,900').split(',').map(t => t.trim()).join(' ');
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_diffusivity_analysis.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_diffusivity_results'}" \\
  --species ${params.species || 'Li'} \\
  --temperatures ${temps} \\
  --steps ${params.steps || 10000}`;
    }

    default:
      return '# Unknown feature';
  }
}

// Upload file to server and get server path
async function uploadFileToServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to server');
  }

  const data = await response.json();
  return data.path;
}

// Validate and parse structure file
async function validateStructure(file: File): Promise<StructureFile> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  let type: 'single' | 'zip' | 'list' = 'single';

  if (ext === 'zip') {
    type = 'zip';
  } else if (ext === 'txt' || ext === 'list') {
    type = 'list';
  }

  // Upload file to server first
  const serverPath = await uploadFileToServer(file);

  if (type === 'single') {
    const content = await file.text();
    const parsed = parseStructureFile(content, file.name);
    return {
      name: file.name,
      path: serverPath,
      type,
      validated: parsed.atoms > 0,
      atoms: parsed.atoms,
      formula: parsed.formula,
      lattice: parsed.lattice,
    };
  } else if (type === 'zip') {
    const multiInfo = await parseZipFile(file);
    return {
      name: file.name,
      path: serverPath,
      type,
      validated: multiInfo.totalCount > 0,
      atoms: multiInfo.totalCount,
      formula: `${multiInfo.totalCount} structures`,
      multiInfo: {
        totalCount: multiInfo.totalCount,
        samples: multiInfo.samples.map(s => ({
          name: s.name,
          atoms: s.atoms,
          formula: s.formula,
          lattice: s.lattice ? { a: s.lattice.a, b: s.lattice.b, c: s.lattice.c } : undefined,
        })),
      },
    };
  } else {
    const content = await file.text();
    const multiInfo = await parseStructureListWithDetails(content);
    return {
      name: file.name,
      path: serverPath,
      type,
      validated: multiInfo.totalCount > 0,
      atoms: multiInfo.totalCount,
      formula: `${multiInfo.totalCount} structures`,
      multiInfo: {
        totalCount: multiInfo.totalCount,
        samples: multiInfo.samples.map(s => ({
          name: s.name,
          atoms: s.atoms,
          formula: s.formula,
          lattice: s.lattice ? { a: s.lattice.a, b: s.lattice.b, c: s.lattice.c } : undefined,
        })),
      },
    };
  }
}

// Validate structure from path
async function validateStructureFromPath(filePath: string): Promise<StructureFile> {
  const ext = filePath.split('.').pop()?.toLowerCase();
  let type: 'single' | 'zip' | 'list' = 'single';

  if (ext === 'zip') {
    type = 'zip';
  } else if (ext === 'txt' || ext === 'list') {
    type = 'list';
  }

  return {
    name: filePath.split('/').pop() || filePath,
    path: filePath,
    type,
    validated: true,
    atoms: undefined,
    formula: type === 'single' ? '(Path specified - will be parsed at execution)' : `(${type})`,
  };
}

// Execute calculation via WebSocket
function executeViaWebSocket(
  result: ExecutionResult,
  command: string,
  updateResult: (id: string, updates: Partial<ExecutionResult>) => void
) {
  let output = '';

  const ws = new WebSocket(EXECUTE_WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify({
      command: command,
      working_dir: ARC_PATH,
    }));
    updateResult(result.id, {
      progress: 5,
      outputJa: '接続しました。計算を開始します...\n',
      outputEn: 'Connected. Starting calculation...\n',
    });
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'start':
        updateResult(result.id, {
          progress: 10,
          outputJa: output + `開始: ${message.message}\n`,
          outputEn: output + `Starting: ${message.message}\n`,
        });
        break;

      case 'output':
        output += message.data;
        updateResult(result.id, {
          progress: Math.max(10, Math.min(95, message.progress || 50)),
          outputJa: output,
          outputEn: output,
        });
        break;

      case 'complete': {
        const statusMsg = message.return_code === 0
          ? '\n 計算が完了しました。\n'
          : `\n エラー (コード: ${message.return_code})\n`;
        updateResult(result.id, {
          status: message.return_code === 0 ? 'completed' : 'error',
          progress: 100,
          outputJa: output + statusMsg,
          outputEn: output + (message.return_code === 0
            ? '\n Calculation completed.\n'
            : `\n Error (code: ${message.return_code})\n`),
          endTime: new Date(),
        });
        ws.close();
        break;
      }

      case 'error':
        updateResult(result.id, {
          status: 'error',
          progress: 100,
          outputJa: output + `\n エラー: ${message.message}\n`,
          outputEn: output + `\n Error: ${message.message}\n`,
          endTime: new Date(),
        });
        ws.close();
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateResult(result.id, {
      status: 'error',
      progress: 100,
      outputJa: output + '\n バックエンドサーバーに接続できませんでした。\n\nサーバーを起動してください:\ncd server && python api.py\n',
      outputEn: output + '\n Could not connect to backend server.\n\nStart the server:\ncd server && python api.py\n',
      endTime: new Date(),
    });
  };

  ws.onclose = () => {
    console.log('WebSocket closed');
  };
}

export function useShoshin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState>('waiting_structure');
  const [currentStructure, setCurrentStructure] = useState<StructureFile | null>(null);
  const [pendingConfig, setPendingConfig] = useState<ExecutionConfig | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [executionResults, setExecutionResults] = useState<ExecutionResult[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  const updateResult = useCallback((id: string, updates: Partial<ExecutionResult>) => {
    setExecutionResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  // Handle structure file upload
  const handleStructureUpload = useCallback(async (fileOrPath: File | string) => {
    setIsLoading(true);

    const isFile = fileOrPath instanceof File;
    const fileName = isFile ? fileOrPath.name : fileOrPath;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `File: ${fileName}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const structureFile = isFile
        ? await validateStructure(fileOrPath)
        : await validateStructureFromPath(fileOrPath);

      setCurrentStructure(structureFile);
      setConversationState('structure_confirmed');

      let responseContent = '';
      if (structureFile.type === 'single') {
        const latticeInfo = structureFile.lattice
          ? `\nLattice: a=${structureFile.lattice.a.toFixed(3)}A, b=${structureFile.lattice.b.toFixed(3)}A, c=${structureFile.lattice.c.toFixed(3)}A`
          : '';
        responseContent = `Structure file recognized.

【File Info】
* Filename: ${structureFile.name}
* Atoms: ${structureFile.atoms || '(analyzing)'}
* Formula: ${structureFile.formula}${latticeInfo}

What would you like to calculate with this structure?
Examples: MD simulation, structure optimization, elastic properties, surface generation, etc.`;
      } else {
        const typeLabel = structureFile.type === 'zip' ? 'ZIP file' : 'Structure list file';
        let samplesInfo = '';
        if (structureFile.multiInfo && structureFile.multiInfo.samples.length > 0) {
          samplesInfo = '\n\n【Sample Structures】';
          structureFile.multiInfo.samples.forEach((sample, index) => {
            samplesInfo += `\n${index + 1}. ${sample.name || 'Unknown'} - ${sample.formula}`;
          });
        }

        responseContent = `${typeLabel} recognized.

【File Info】
* Filename: ${structureFile.name}
* Structures: ${structureFile.multiInfo?.totalCount || structureFile.atoms || 'multiple'}${samplesInfo}

What would you like to calculate with these structures?
Examples: Batch structure optimization, batch MD simulation, batch diffusivity analysis, etc.`;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        structureFile,
      };
      setMessages((prev) => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Structure validation error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Failed to read structure file. Supported formats: .cif, .vasp, .xyz, .poscar, .zip, .txt`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send message to LLM
  const sendMessage = useCallback(async (content: string) => {
    if (conversationState === 'waiting_structure') {
      if (content.match(/\.(cif|vasp|xyz|poscar|zip|txt|list)$/i)) {
        await handleStructureUpload(content);
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Please specify a structure file first.

Supported formats:
* Single structure: .cif, .vasp, .xyz, .poscar
* Multiple structures: .zip (multiple files), .txt (path list)

Drag & drop a file or enter the path.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const isConfirmation = /^(ok|yes|はい|よろしい|実行|これでいい|お願い|proceed|confirm|go ahead)$/i.test(content.trim());

    if (isConfirmation && pendingConfig && (conversationState === 'waiting_param_confirm' || conversationState === 'ready_to_execute')) {
      const confirmMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Ready to execute. Click the button below to start calculation.`,
        timestamp: new Date(),
        executionReady: {
          featureId: pendingConfig.featureId,
          parameters: pendingConfig.parameters,
          command: pendingConfig.command,
        },
      };
      setMessages((prev) => [...prev, confirmMessage]);
      setConversationState('ready_to_execute');
      return;
    }

    setIsLoading(true);

    try {
      const structureInfo = currentStructure
        ? `Current structure: ${currentStructure.name} (${currentStructure.type}, ${currentStructure.atoms || 'multiple'} atoms)`
        : '';

      let prompt = '';
      if ((conversationState === 'waiting_param_confirm' || conversationState === 'ready_to_execute') && pendingConfig && selectedFeature) {
        const paramConfirmPrompt = SYSTEM_PROMPT_PARAM_CONFIRM
          .replace('{feature}', selectedFeature.id)
          .replace('{parameters}', JSON.stringify(pendingConfig.parameters));
        prompt = `${paramConfirmPrompt}\n\nUser: ${content}\n\nAssistant:`;
      } else {
        prompt = `${SYSTEM_PROMPT_ASK_ACTION}\n\n${structureInfo}\n\nUser: ${content}\n\nAssistant:`;
      }

      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 800,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to Ollama');
      }

      const data = await response.json();
      const assistantContent = data.response || 'Sorry, I could not generate a response.';

      const jsonMatch = assistantContent.match(/```json\s*([\s\S]*?)\s*```/);
      let executionConfig: ExecutionConfig | undefined;
      let detectedFeature: Feature | null = null;

      if (jsonMatch) {
        try {
          const config = JSON.parse(jsonMatch[1]);
          if (config.feature) {
            const allFeatures = [...features, ...batchFeatures];
            const feature = allFeatures.find((f) => f.id === config.feature);
            if (feature && currentStructure) {
              const command = generateCommand(config.feature, config.parameters || {}, currentStructure.path);
              executionConfig = {
                featureId: config.feature,
                parameters: config.parameters || {},
                command,
              };
              detectedFeature = feature;
            }
          }
        } catch (e) {
          console.error('Failed to parse JSON config:', e);
        }
      }

      if (!executionConfig && currentStructure) {
        const contentLower = assistantContent.toLowerCase();
        const allFeatures = [...features, ...batchFeatures];

        let detectedFeatureId: string | null = null;
        let detectedParams: Record<string, string | number> = {};

        if (contentLower.includes('optimization') || contentLower.includes('最適化')) {
          detectedFeatureId = 'structure-optimization';
          const fmaxMatch = assistantContent.match(/fmax[:\s]*([0-9.]+)/i);
          detectedParams = {
            fmax: fmaxMatch ? parseFloat(fmaxMatch[1]) : 0.05,
            optimize_cell: contentLower.includes('cell') && !contentLower.includes('no') ? 'yes' : 'no',
          };
        } else if (contentLower.includes('md') || contentLower.includes('molecular dynamics')) {
          detectedFeatureId = 'md-simulation';
          const tempMatch = assistantContent.match(/temperature[:\s]*([0-9]+)/i) || assistantContent.match(/([0-9]+)\s*k/i);
          const stepsMatch = assistantContent.match(/steps?[:\s]*([0-9]+)/i);
          detectedParams = {
            temperature: tempMatch ? parseInt(tempMatch[1]) : 300,
            steps: stepsMatch ? parseInt(stepsMatch[1]) : 1000,
            timestep: 1.0,
            ensemble: 'NVT',
          };
        }

        if (detectedFeatureId) {
          const feature = allFeatures.find(f => f.id === detectedFeatureId);
          if (feature) {
            const command = generateCommand(detectedFeatureId, detectedParams, currentStructure.path);
            executionConfig = {
              featureId: detectedFeatureId,
              parameters: detectedParams,
              command,
            };
            detectedFeature = feature;
          }
        }
      }

      if (executionConfig && detectedFeature) {
        setSelectedFeature(detectedFeature);
        setPendingConfig(executionConfig);
        setConversationState('waiting_param_confirm');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent.replace(/```json[\s\S]*?```/g, '').trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Could not connect to Ollama.

To start Ollama:
\`\`\`
ollama serve
\`\`\`

Or directly enter what you want to calculate.
Example: "Run MD simulation at 300K"`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationState, currentStructure, handleStructureUpload, pendingConfig, selectedFeature]);

  // Execute the pending configuration
  const executeCalculation = useCallback(() => {
    if (!pendingConfig || !selectedFeature) return;

    const newResult: ExecutionResult = {
      id: Date.now().toString(),
      featureId: selectedFeature.id,
      featureNameEn: selectedFeature.name,
      featureNameJa: selectedFeature.nameJa,
      status: 'running',
      progress: 0,
      command: pendingConfig.command,
      outputEn: '',
      outputJa: '',
      startTime: new Date(),
    };

    setExecutionResults((prev) => [newResult, ...prev]);

    const execMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Calculation started!

Check the progress in the "Results" panel on the right.

To run another calculation with the same structure, type what you want to do.
To use a new structure, upload a new file.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, execMessage]);

    executeViaWebSocket(newResult, pendingConfig.command, updateResult);

    setPendingConfig(null);
    setSelectedFeature(null);
    setShowDialog(false);
    setConversationState('structure_confirmed');
  }, [pendingConfig, selectedFeature, updateResult]);

  // Reset conversation
  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationState('waiting_structure');
    setCurrentStructure(null);
    setPendingConfig(null);
    setSelectedFeature(null);
  }, []);

  // Feature card selection
  const selectFeature = useCallback((feature: Feature) => {
    setSelectedFeature(feature);
    const defaultParams: Record<string, string | number> = {};

    feature.parameters.forEach((p) => {
      if (['structure', 'structure_list', 'trajectory'].includes(p.name) && currentStructure?.path) {
        defaultParams[p.name] = currentStructure.path;
      } else {
        defaultParams[p.name] = p.default;
      }
    });

    const structurePath = currentStructure?.path
      || defaultParams.structure as string
      || defaultParams.structure_list as string
      || defaultParams.trajectory as string
      || 'structure.cif';

    setPendingConfig({
      featureId: feature.id,
      parameters: defaultParams,
      command: generateCommand(feature.id, defaultParams, structurePath),
    });
    setShowDialog(true);
  }, [currentStructure]);

  const updateConfig = useCallback((key: string, value: string | number) => {
    setPendingConfig((prev) => {
      if (!prev) return null;
      const newParams = { ...prev.parameters, [key]: value };

      const structurePath = currentStructure?.path
        || newParams.structure as string
        || newParams.structure_list as string
        || newParams.trajectory as string
        || 'structure.cif';

      return {
        ...prev,
        parameters: newParams,
        command: generateCommand(prev.featureId, newParams, structurePath),
      };
    });
  }, [currentStructure]);

  const confirmExecution = useCallback(() => {
    executeCalculation();
    setShowDialog(false);
  }, [executeCalculation]);

  const cancelExecution = useCallback(() => {
    setPendingConfig(null);
    setSelectedFeature(null);
    setShowDialog(false);
    setConversationState('structure_confirmed');
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    selectFeature,
    pendingConfig,
    selectedFeature,
    updateConfig,
    confirmExecution,
    cancelExecution,
    executionResults,
    conversationState,
    currentStructure,
    handleStructureUpload,
    executeCalculation,
    resetConversation,
    showDialog,
  };
}
