import { useState, useCallback, useRef, useEffect } from 'react';

// Configuration
const ARC_PATH = '/Users/hisatsuguyamasaki/Projects/theory_engine/ARC';
const PYTHON_CMD = `${ARC_PATH}/venv/bin/python`;
const OLLAMA_URL = '/api/ollama/generate';
const EXECUTE_WS_URL = 'ws://localhost:8081/ws/execute';
const UPLOAD_URL = 'http://localhost:8081/upload';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  command?: string;
  executionStatus?: 'pending' | 'running' | 'completed' | 'error';
  executionOutput?: string;
}

interface MatlantisAction {
  type: string;
  params: Record<string, string>;
  structurePath?: string;
}

interface MatlantisChatProps {
  onClose?: () => void;
}

// System prompt for Ollama to interpret user requests
const SYSTEM_PROMPT = `You are a helpful Matlantis calculation assistant. You help users run computational materials science simulations.

Available calculation types:
- MD simulation: molecular dynamics at specified temperature
- Structure optimization: optimize atomic positions and optionally cell
- Diffusivity analysis: calculate diffusion coefficient for a species
- RDF analysis: calculate radial distribution function
- Elastic properties: calculate elastic constants
- Thermal conductivity: calculate thermal conductivity

When user describes what they want to do:
1. Identify the calculation type
2. Extract parameters from their request
3. Ask for confirmation before executing

Respond with JSON when you identify a calculation:
\`\`\`json
{"action": "calculation_type", "params": {...}, "status": "propose"}
\`\`\`

For confirmations, respond with:
\`\`\`json
{"action": "calculation_type", "params": {...}, "status": "confirmed"}
\`\`\`

Be concise and helpful.`;

// Parse LLM response to extract action
function parseActionFromResponse(response: string): MatlantisAction | null {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.action && data.status === 'confirmed') {
        return {
          type: data.action,
          params: data.params || {},
        };
      }
    } catch {
      // Ignore parse errors
    }
  }
  return null;
}

// Generate command from action
function generateCommand(action: MatlantisAction): string {
  const { type, params, structurePath } = action;
  const structure = structurePath || params.structure || 'structure.cif';

  switch (type) {
    case 'md':
    case 'md_simulation':
    case 'matlantis_md': {
      const temp = params.temperature || '300';
      const steps = params.steps || '1000';
      const timestep = params.timestep || '1.0';
      const ensemble = params.ensemble || 'NVT';
      const totalTime = (Number(steps) * Number(timestep) / 1000).toFixed(3);
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_md_from_prompt_on_matlantis.py \\
  'MD at ${temp}K using ${ensemble} for ${totalTime} ps at ${timestep} fs timestep' \\
  --structure "${structure}" \\
  --output-dir "./md_results"`;
    }

    case 'optimization':
    case 'structure_optimization':
    case 'matlantis_optimization': {
      const fmax = params.fmax || '0.05';
      const optimizeCell = params.optimize_cell === 'yes' || params.optimize_cell === 'true';
      return `cd ${ARC_PATH} && ${PYTHON_CMD} scripts/run_optimization_on_matlantis.py \\
  'Optimize structure' \\
  --structure "${structure}" \\
  --fmax ${fmax}${optimizeCell ? ' \\\n  --optimize-cell' : ''} \\
  --output-dir "./opt_results"`;
    }

    default:
      return `# Unsupported action type: ${type}`;
  }
}

export function MatlantisChat({ onClose }: MatlantisChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you run Matlantis calculations. Upload a structure file and tell me what you want to do.\n\nFor example:\n- "Run MD simulation at 500K"\n- "Optimize the structure"\n- "Calculate diffusivity of Li"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [structureFile, setStructureFile] = useState<File | null>(null);
  const [structurePath, setStructurePath] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<MatlantisAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Upload structure file
  const handleFileUpload = useCallback(async (file: File) => {
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

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Structure file uploaded: ${file.name}`,
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, []);

  // Send message to Ollama
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:8b',
          prompt: `${SYSTEM_PROMPT}\n\nUser has uploaded: ${structureFile?.name || 'no file'}\n\nUser: ${input}\n\nAssistant:`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Ollama');
      }

      const data = await response.json();
      const assistantContent = data.response || 'Sorry, I could not process that request.';

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if there's a confirmed action
      const action = parseActionFromResponse(assistantContent);
      if (action) {
        action.structurePath = structurePath;
        setPendingAction(action);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error}. Make sure Ollama is running.`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, structureFile, structurePath]);

  // Execute pending action
  const executeAction = useCallback(() => {
    if (!pendingAction) return;

    const command = generateCommand(pendingAction);
    const executionMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'system',
      content: `Executing command...`,
      timestamp: new Date(),
      command,
      executionStatus: 'running',
      executionOutput: '',
    };
    setMessages(prev => [...prev, executionMessage]);
    setPendingAction(null);

    // Execute via WebSocket
    const ws = new WebSocket(EXECUTE_WS_URL);
    let output = '';

    ws.onopen = () => {
      ws.send(JSON.stringify({
        command,
        working_dir: ARC_PATH,
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'output') {
        output += message.data;
        setMessages(prev => prev.map(m =>
          m.id === executionMessage.id
            ? { ...m, executionOutput: output }
            : m
        ));
      } else if (message.type === 'complete') {
        setMessages(prev => prev.map(m =>
          m.id === executionMessage.id
            ? {
                ...m,
                executionStatus: message.return_code === 0 ? 'completed' : 'error',
                executionOutput: output + `\n\n${message.return_code === 0 ? '✓ Completed' : '✗ Error'}`,
              }
            : m
        ));
      } else if (message.type === 'error') {
        setMessages(prev => prev.map(m =>
          m.id === executionMessage.id
            ? { ...m, executionStatus: 'error', executionOutput: output + `\nError: ${message.message}` }
            : m
        ));
      }
    };

    ws.onerror = () => {
      setMessages(prev => prev.map(m =>
        m.id === executionMessage.id
          ? { ...m, executionStatus: 'error', executionOutput: 'WebSocket error' }
          : m
      ));
    };
  }, [pendingAction]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-semibold">Matlantis Chat</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Structure file upload */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".cif,.xyz,.vasp,.poscar"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="text-xs flex-1"
          />
          {structureFile && (
            <span className="text-xs text-green-400">✓ {structureFile.name}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[85%] p-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-cyan-600 text-white'
                : msg.role === 'system'
                ? 'bg-slate-700 text-slate-300'
                : 'bg-slate-800 text-slate-100'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.command && (
                <pre className="mt-2 text-xs bg-slate-900 p-2 rounded overflow-x-auto">
                  {msg.command}
                </pre>
              )}
              {msg.executionOutput && (
                <pre className="mt-2 text-xs bg-slate-900 text-green-400 p-2 rounded max-h-40 overflow-y-auto">
                  {msg.executionOutput}
                </pre>
              )}
            </div>
          </div>
        ))}

        {/* Pending action confirmation */}
        {pendingAction && (
          <div className="bg-cyan-900/50 border border-cyan-600 rounded-lg p-3">
            <p className="text-sm text-cyan-200 mb-2">Ready to execute:</p>
            <pre className="text-xs bg-slate-900 p-2 rounded mb-2 overflow-x-auto">
              {generateCommand(pendingAction)}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={executeAction}
                className="flex-1 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded"
              >
                Execute
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-slate-400 text-sm">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Describe what you want to calculate..."
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
