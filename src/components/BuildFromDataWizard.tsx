import { useState, useCallback, useRef } from 'react';
import type { CausalGraph, DataColumn, GraphBuilderConfig, GraphBuildResult } from '../types';
import { buildGraphFromData, parseCSVColumns, parseExcelColumns, getPresetConfig } from '../services/graphBuilder';

interface BuildFromDataWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGraphBuilt: (graph: CausalGraph) => void;
  onPreviewGraph: (graph: CausalGraph) => void;  // Show graph in main view without closing
}

type Step = 1 | 2 | 3;
type ColumnInputMode = 'file' | 'manual';

export function BuildFromDataWizard({ isOpen, onClose, onGraphBuilt, onPreviewGraph }: BuildFromDataWizardProps) {
  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [context, setContext] = useState('');
  const [columns, setColumns] = useState<DataColumn[]>([]);
  const [columnInputMode, setColumnInputMode] = useState<ColumnInputMode>('manual');
  const [fileLoading, setFileLoading] = useState(false);

  // Generation config
  const [config, setConfig] = useState<GraphBuilderConfig>({ preset: 'balanced', iterations: 2 });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<GraphBuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual column input state
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnDescription, setNewColumnDescription] = useState('');

  // CSV input state
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setStep(1);
    setContext('');
    setColumns([]);
    setColumnInputMode('manual');
    setConfig({ preset: 'balanced', iterations: 2 });
    setIsGenerating(false);
    setProgress('');
    setResult(null);
    setError(null);
    setNewColumnName('');
    setNewColumnDescription('');
    setCsvText('');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (!isGenerating) {
      resetWizard();
      onClose();
    }
  }, [isGenerating, resetWizard, onClose]);

  // Add column manually
  const handleAddColumn = useCallback(() => {
    if (!newColumnName.trim()) return;

    const newColumn: DataColumn = {
      name: newColumnName.trim(),
      description: newColumnDescription.trim() || undefined
    };

    setColumns(prev => [...prev, newColumn]);
    setNewColumnName('');
    setNewColumnDescription('');
  }, [newColumnName, newColumnDescription]);

  // Remove column
  const handleRemoveColumn = useCallback((index: number) => {
    setColumns(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update column description
  const handleUpdateColumnDescription = useCallback((index: number, description: string) => {
    setColumns(prev => prev.map((col, i) =>
      i === index ? { ...col, description: description || undefined } : col
    ));
  }, []);

  // Handle file upload (CSV or Excel)
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    setFileLoading(true);
    setError(null);

    try {
      if (isExcel) {
        // Parse Excel file
        const parsedColumns = await parseExcelColumns(file);
        setColumns(parsedColumns.map(name => ({ name })));
        setCsvText(`(Excel file: ${file.name})`);
      } else {
        // Parse CSV file
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setCsvText(text);
          const parsedColumns = parseCSVColumns(text);
          setColumns(parsedColumns.map(name => ({ name })));
        };
        reader.readAsText(file);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse file';
      setError(message);
    } finally {
      setFileLoading(false);
    }
  }, []);

  // Handle CSV text paste
  const handleCSVTextChange = useCallback((text: string) => {
    setCsvText(text);

    // Parse columns when text changes
    if (text.trim()) {
      const parsedColumns = parseCSVColumns(text);
      setColumns(parsedColumns.map(name => ({ name })));
    } else {
      setColumns([]);
    }
  }, []);

  // Handle preset change
  const handlePresetChange = useCallback((preset: GraphBuilderConfig['preset']) => {
    setConfig({
      preset,
      iterations: getPresetConfig(preset)
    });
  }, []);

  // Handle custom iterations change
  const handleIterationsChange = useCallback((iterations: number) => {
    setConfig(prev => ({
      ...prev,
      preset: 'custom',
      iterations: Math.max(1, Math.min(10, iterations))
    }));
  }, []);

  // Generate graph
  const handleGenerate = useCallback(async () => {
    if (columns.length === 0) {
      setError('Please add at least one column');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress('Starting...');
    setResult(null);

    try {
      const buildResult = await buildGraphFromData(
        context,
        columns,
        config,
        setProgress
      );

      setResult(buildResult);
      setProgress('Complete!');

      // Immediately show the graph in main view for preview
      onPreviewGraph(buildResult.graph);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build graph';
      setError(message);
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  }, [context, columns, config]);

  // Accept result
  const handleAccept = useCallback(() => {
    if (result) {
      onGraphBuilt(result.graph);
      resetWizard();
      onClose();
    }
  }, [result, onGraphBuilt, resetWizard, onClose]);

  // Refine more
  const handleRefineMore = useCallback(async () => {
    if (!result) return;

    // Increase iterations by 2 and regenerate
    setConfig(prev => ({
      preset: 'custom',
      iterations: prev.iterations + 2
    }));

    setIsGenerating(true);
    setError(null);
    setProgress('Refining further...');

    try {
      const buildResult = await buildGraphFromData(
        context,
        columns,
        { preset: 'custom', iterations: config.iterations + 2 },
        setProgress
      );

      setResult(buildResult);
      setProgress('Complete!');

      // Update preview with refined graph
      onPreviewGraph(buildResult.graph);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refine graph';
      setError(message);
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  }, [result, context, columns, config.iterations, onPreviewGraph]);

  if (!isOpen) return null;

  // Use compact mode when showing results (so user can see the graph preview)
  const isCompactMode = result !== null;

  return (
    <div className={`fixed inset-0 ${isCompactMode ? 'pointer-events-none' : 'bg-black/50'} flex ${isCompactMode ? 'items-start justify-end p-4' : 'items-center justify-center'} z-50`}>
      <div className={`bg-white rounded-lg shadow-xl overflow-hidden flex flex-col pointer-events-auto ${isCompactMode ? 'w-80 max-h-[50vh]' : 'w-full max-w-2xl max-h-[90vh]'}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Build from Data</h2>
            <p className="text-sm text-gray-500">
              Step {step} of 3: {step === 1 ? 'Context' : step === 2 ? 'Columns' : 'Generate'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Context */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experimental Context
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Describe your experiment or domain. For example: 'This experiment studies the factors affecting oxygen reduction reaction (ORR) catalysis in rotating disk electrode (RDE) experiments. Key variables include catalyst loading, rotation rate, electrolyte concentration, and measured current density.'"
                  className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Provide context about your experiment to help the AI understand the domain and propose meaningful causal relationships.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Columns */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Tab toggle */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setColumnInputMode('manual')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    columnInputMode === 'manual'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setColumnInputMode('file')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    columnInputMode === 'file'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload File
                </button>
              </div>

              {/* Manual entry */}
              {columnInputMode === 'manual' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Column name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                    />
                    <input
                      type="text"
                      value={newColumnDescription}
                      onChange={(e) => setNewColumnDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                    />
                    <button
                      onClick={handleAddColumn}
                      disabled={!newColumnName.trim()}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* File upload (CSV or Excel) */}
              {columnInputMode === 'file' && (
                <div className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={fileLoading}
                      className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
                    >
                      {fileLoading ? 'Loading...' : 'Choose File'}
                    </button>
                    <span className="ml-2 text-sm text-gray-500">CSV or Excel (.xlsx, .xls)</span>
                  </div>
                  <textarea
                    value={csvText}
                    onChange={(e) => handleCSVTextChange(e.target.value)}
                    placeholder="Or paste CSV data here (first row will be used as column names)"
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-sm font-mono resize-none"
                  />
                </div>
              )}

              {/* Column list */}
              {columns.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Columns ({columns.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {columns.map((col, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm font-medium text-gray-900 min-w-[120px]">
                          {col.name}
                        </span>
                        <input
                          type="text"
                          value={col.description || ''}
                          onChange={(e) => handleUpdateColumnDescription(index, e.target.value)}
                          placeholder="Add description..."
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-green-500 focus:border-green-500"
                        />
                        <button
                          onClick={() => handleRemoveColumn(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {columns.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No columns added yet. Add columns manually or upload a CSV file.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Config selector */}
              {!result && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Generation Mode
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {(['fast', 'balanced', 'heavy', 'custom'] as const).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handlePresetChange(preset)}
                        disabled={isGenerating}
                        className={`p-3 rounded-lg border-2 text-center transition-colors ${
                          config.preset === preset
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-sm font-medium capitalize">{preset}</div>
                        <div className="text-xs text-gray-500">
                          {preset === 'fast' && '1 iteration'}
                          {preset === 'balanced' && '2 iterations'}
                          {preset === 'heavy' && '4 iterations'}
                          {preset === 'custom' && `${config.iterations} iterations`}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom iterations input */}
                  {config.preset === 'custom' && (
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-sm text-gray-600">Iterations:</label>
                      <input
                        type="number"
                        value={config.iterations}
                        onChange={(e) => handleIterationsChange(parseInt(e.target.value) || 1)}
                        min={1}
                        max={10}
                        disabled={isGenerating}
                        className="w-20 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Summary before generation */}
              {!result && !isGenerating && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>Context: {context ? `${context.slice(0, 50)}...` : '(not provided)'}</li>
                    <li>Columns: {columns.length} column{columns.length !== 1 ? 's' : ''}</li>
                    <li>Mode: {config.preset} ({config.iterations} iteration{config.iterations !== 1 ? 's' : ''})</li>
                  </ul>
                </div>
              )}

              {/* Progress display */}
              {isGenerating && (
                <div className="p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mb-4" />
                  <p className="text-sm text-gray-600">{progress}</p>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Result preview */}
              {result && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Graph Built Successfully</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>Nodes: {result.graph.nodes.length}</li>
                      <li>Edges: {result.graph.edges.length}</li>
                      <li>Iterations: {result.iterations}</li>
                      <li>Tokens used: {result.tokenUsage.totalTokens.toLocaleString()}</li>
                    </ul>
                  </div>

                  {/* Node preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Nodes</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.graph.nodes.map(node => (
                        <div key={node.id} className="text-sm p-2 bg-gray-50 rounded">
                          <span className="font-medium">{node.displayName}</span>
                          <span className="text-gray-500 ml-2">({node.id})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edge preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Edges</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {result.graph.edges.map(edge => {
                        const source = result.graph.nodes.find(n => n.id === edge.source);
                        const target = result.graph.nodes.find(n => n.id === edge.target);
                        return (
                          <div key={edge.id} className="text-sm p-2 bg-gray-50 rounded">
                            {source?.displayName || edge.source} → {target?.displayName || edge.target}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Critique summary */}
                  {result.critiqueSummary && result.critiqueSummary !== 'No issues found' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Feedback Applied</h4>
                      <p className="text-xs text-yellow-700">{result.critiqueSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {/* Step indicators */}
            <div className="flex gap-2">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${
                    s === step ? 'bg-green-500' : s < step ? 'bg-green-300' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            {/* Back button */}
            {step > 1 && !result && (
              <button
                onClick={() => setStep((step - 1) as Step)}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Back
              </button>
            )}

            {/* Next/Generate/Accept buttons */}
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                Next
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={columns.length === 0}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}

            {step === 3 && !result && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || columns.length === 0}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            )}

            {step === 3 && result && (
              <>
                <button
                  onClick={handleRefineMore}
                  disabled={isGenerating}
                  className="px-4 py-2 text-sm font-medium text-green-700 hover:text-green-900 disabled:opacity-50"
                >
                  Refine More
                </button>
                <button
                  onClick={handleAccept}
                  disabled={isGenerating}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Accept
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
