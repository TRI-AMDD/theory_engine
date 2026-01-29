import { useState, useCallback } from 'react';
import type { ConsolidatedAction, ActionType } from '../types';

// ARC project path - must match useShoshin.ts
const ARC_PATH = '/Users/hisatsuguyamasaki/Projects/theory_engine/ARC';
const PYTHON_CMD = `${ARC_PATH}/venv/bin/python`;
const EXECUTE_WS_URL = 'ws://localhost:8081/ws/execute';
const UPLOAD_URL = 'http://localhost:8081/upload';

interface ExecutionResult {
  status: 'idle' | 'running' | 'completed' | 'error';
  output: string;
  progress: number;
  jobId?: string;
}

interface MatlantisExecutorProps {
  action: ConsolidatedAction;
  onExecutionComplete?: (result: ExecutionResult) => void;
}

// Generate Matlantis command based on action type
function generateMatlantisCommand(actionType: ActionType, params: Record<string, string>, structurePath: string): string {
  switch (actionType) {
    case 'matlantis_md': {
      const temp = params.temperature || '300';
      const steps = params.steps || '1000';
      const timestep = params.timestep || '1.0';
      const ensemble = params.ensemble || 'NVT';
      const totalTime = (Number(steps) * Number(timestep) / 1000).toFixed(3);
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_md_from_prompt_on_matlantis.py \\
  'MD at ${temp}K using ${ensemble} for ${totalTime} ps at ${timestep} fs timestep' \\
  --structure "${structurePath}" \\
  --output-dir "./md_results"`;
    }

    case 'matlantis_optimization': {
      const fmax = params.fmax || '0.05';
      const optimizeCell = params.optimize_cell === 'yes' || params.optimize_cell === 'true';
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_optimization_on_matlantis.py \\
  'Optimize structure' \\
  --structure "${structurePath}" \\
  --fmax ${fmax}${optimizeCell ? ' \\\n  --optimize-cell' : ''} \\
  --output-dir "./opt_results"`;
    }

    case 'matlantis_diffusivity':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_diffusivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species ${params.species || 'Li'} \\
  --temperature ${params.temperature || '300'}`;

    case 'matlantis_rdf':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_rdf.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species1 ${params.species1 || 'O'} \\
  --species2 ${params.species2 || 'H'} \\
  --r-max ${params.r_max || '8.0'}`;

    case 'matlantis_thermal':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_thermal_conductivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --temperature ${params.temperature || '300'}`;

    case 'matlantis_elastic':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_elastic.py \\
  "${structurePath}" \\
  --strain ${params.strain || '0.01'}`;

    case 'matlantis_neb':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_neb.py \\
  --initial "${params.initial_structure || structurePath}" \\
  --final "${params.final_structure || 'final.cif'}" \\
  --n-images ${params.n_images || '7'} \\
  --fmax ${params.fmax || '0.05'} \\
  --method ${params.method || 'NEB'}`;

    case 'matlantis_surface':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/generate_surface.py \\
  "${structurePath}" \\
  --miller ${params.miller_h || '1'} ${params.miller_k || '1'} ${params.miller_l || '1'} \\
  --layers ${params.layers || '4'} \\
  --vacuum ${params.vacuum || '15.0'}`;

    case 'matlantis_molecule':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/generate_molecule.py \\
  --smiles "${params.smiles || ''}" \\
  --name "${params.name || ''}" \\
  --output "${params.output || 'molecule.xyz'}"${params.optimize === 'yes' ? ' \\\n  --optimize' : ''}`;

    case 'matlantis_ionic':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_ionic_conductivity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --species ${params.species || 'Li'} \\
  --temperature ${params.temperature || '300'} \\
  --charge ${params.charge || '1'}`;

    case 'matlantis_phonon':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_phonon_dos.py \\
  "${structurePath}" \\
  --supercell ${params.supercell_x || '2'} ${params.supercell_y || '2'} ${params.supercell_z || '2'} \\
  --displacement ${params.displacement || '0.01'}`;

    case 'matlantis_viscosity':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/analyze_viscosity.py \\
  "${params.trajectory || 'trajectory.traj'}" \\
  --temperature ${params.temperature || '300'} \\
  --method ${params.method || 'Green-Kubo'}`;

    // Batch features
    case 'matlantis_batch_optimization':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_optimization.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_opt_results'}" \\
  --fmax ${params.fmax || '0.05'}${params.optimize_cell === 'yes' ? ' \\\n  --optimize-cell' : ''}`;

    case 'matlantis_batch_md':
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_md.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_md_results'}" \\
  --temperature ${params.temperature || '300'} \\
  --steps ${params.steps || '1000'} \\
  --ensemble ${params.ensemble || 'NVT'}`;

    case 'matlantis_batch_diffusivity': {
      const temps = String(params.temperatures || '300,500,700,900').split(',').map(t => t.trim()).join(' ');
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_batch_diffusivity_analysis.py \\
  --list "${structurePath}" \\
  --output-dir "${params.output_dir || './batch_diffusivity_results'}" \\
  --species ${params.species || 'Li'} \\
  --temperatures ${temps} \\
  --steps ${params.steps || '10000'}`;
    }

    default:
      return `# Unsupported action type: ${actionType}`;
  }
}

// Extract JOB ID from output
function extractJobId(output: string): string | null {
  const patterns = [
    /Job\s*ID[:\s]+(\d{8}T\d{6}Z_[a-f0-9]+)/i,
    /job_id[:\s]+["']?(\d{8}T\d{6}Z_[a-f0-9]+)["']?/i,
    /mms_runs\/(\d{8}T\d{6}Z_[a-f0-9]+)/i,
    /(\d{8}T\d{6}Z_[a-f0-9]{12})/,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function MatlantisExecutor({ action, onExecutionComplete }: MatlantisExecutorProps) {
  const [result, setResult] = useState<ExecutionResult>({
    status: 'idle',
    output: '',
    progress: 0,
  });
  const [structureFile, setStructureFile] = useState<File | null>(null);
  const [structurePath, setStructurePath] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Check if this is a Matlantis action
  const isMatlantisAction = action.actionType.startsWith('matlantis_');

  // Upload structure file
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setStructureFile(file);
      setStructurePath(data.path);
    } catch (error) {
      console.error('Upload error:', error);
      setResult(prev => ({
        ...prev,
        status: 'error',
        output: `Upload failed: ${error}`,
      }));
    } finally {
      setIsUploading(false);
    }
  }, []);

  // Execute the action
  const handleExecute = useCallback(() => {
    if (!structurePath && !action.commonParameters.structure && !action.commonParameters.trajectory) {
      setResult(prev => ({
        ...prev,
        status: 'error',
        output: 'Please upload a structure file first.',
      }));
      return;
    }

    const targetPath = structurePath || action.commonParameters.structure || action.commonParameters.trajectory || '';
    const command = generateMatlantisCommand(action.actionType, action.commonParameters, targetPath);

    setResult({
      status: 'running',
      output: `Executing: ${command}\n\n`,
      progress: 5,
    });

    const ws = new WebSocket(EXECUTE_WS_URL);
    let output = '';

    ws.onopen = () => {
      ws.send(JSON.stringify({
        command,
        working_dir: ARC_PATH,
      }));
      setResult(prev => ({
        ...prev,
        progress: 10,
        output: prev.output + 'Connected to execution server...\n',
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'start':
          setResult(prev => ({
            ...prev,
            progress: 15,
            output: prev.output + `Starting: ${message.message}\n`,
          }));
          break;

        case 'output':
          output += message.data;
          setResult(prev => ({
            ...prev,
            progress: Math.max(15, Math.min(95, message.progress || 50)),
            output: prev.output + message.data,
          }));
          break;

        case 'complete': {
          const jobId = extractJobId(output);
          const finalResult: ExecutionResult = {
            status: message.return_code === 0 ? 'completed' : 'error',
            output: output + `\n\n${message.return_code === 0 ? '✓ Completed successfully' : `✗ Error (code: ${message.return_code})`}`,
            progress: 100,
            jobId: jobId || undefined,
          };
          setResult(finalResult);
          onExecutionComplete?.(finalResult);
          break;
        }

        case 'error':
          setResult(prev => ({
            ...prev,
            status: 'error',
            output: prev.output + `\nError: ${message.message}`,
            progress: 0,
          }));
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setResult(prev => ({
        ...prev,
        status: 'error',
        output: prev.output + '\nWebSocket connection error. Is the backend server running?',
      }));
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };
  }, [action, structurePath, onExecutionComplete]);

  // Reset
  const handleReset = useCallback(() => {
    setResult({
      status: 'idle',
      output: '',
      progress: 0,
    });
    setStructureFile(null);
    setStructurePath('');
  }, []);

  if (!isMatlantisAction) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
      <h4 className="text-sm font-semibold text-cyan-800 mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Matlantis Execution
      </h4>

      {/* Structure file upload */}
      {result.status === 'idle' && (
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Structure File</label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".cif,.xyz,.vasp,.poscar"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="text-xs"
              disabled={isUploading}
            />
            {isUploading && <span className="text-xs text-gray-500">Uploading...</span>}
            {structureFile && !isUploading && (
              <span className="text-xs text-green-600">✓ {structureFile.name}</span>
            )}
          </div>
        </div>
      )}

      {/* Execute button */}
      {result.status === 'idle' && (
        <button
          onClick={handleExecute}
          disabled={!structurePath && !action.commonParameters.structure}
          className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Execute on Matlantis
        </button>
      )}

      {/* Progress */}
      {result.status === 'running' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Executing...</span>
            <span>{result.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${result.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Output */}
      {result.output && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Output</span>
            {result.jobId && (
              <span className="text-xs text-cyan-600 font-mono">Job ID: {result.jobId}</span>
            )}
          </div>
          <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
            {result.output}
          </pre>
        </div>
      )}

      {/* Status indicator */}
      {result.status === 'completed' && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-green-600 font-medium">✓ Execution completed</span>
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Run again
          </button>
        </div>
      )}

      {result.status === 'error' && (
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-red-600 font-medium">✗ Execution failed</span>
          <button
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
