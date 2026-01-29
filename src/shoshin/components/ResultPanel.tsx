import { useState, useEffect, useCallback } from 'react';
import type { ExecutionResult, ResultFolder } from '../types';

const API_BASE_URL = 'http://localhost:8081';

interface ResultPanelProps {
  results: ExecutionResult[];
  isJapanese: boolean;
}

// Download utility functions
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatResultForDownload(result: ExecutionResult, isJapanese: boolean): string {
  const featureName = isJapanese ? result.featureNameJa : result.featureNameEn;
  const output = isJapanese ? result.outputJa : result.outputEn;
  const statusLabels = {
    pending: isJapanese ? '待機中' : 'Pending',
    running: isJapanese ? '実行中' : 'Running',
    completed: isJapanese ? '完了' : 'Completed',
    error: isJapanese ? 'エラー' : 'Error',
  };

  return `${'='.repeat(60)}
${isJapanese ? '機能' : 'Feature'}: ${featureName}
${isJapanese ? 'ステータス' : 'Status'}: ${statusLabels[result.status]}
${isJapanese ? '開始時刻' : 'Start Time'}: ${result.startTime.toLocaleString()}
${result.endTime ? `${isJapanese ? '終了時刻' : 'End Time'}: ${result.endTime.toLocaleString()}` : ''}
${'='.repeat(60)}

${isJapanese ? 'コマンド' : 'Command'}:
${result.command}

${isJapanese ? '出力' : 'Output'}:
${output || (isJapanese ? '(出力なし)' : '(No output)')}

`;
}

// ARC project path - must match useShoshin.ts
const ARC_PATH = '/Users/hisatsuguyamasaki/Projects/theory_engine/ARC';

// Extract output directory from command
function extractOutputDir(command: string): string | null {
  const match = command.match(/--output-dir\s+["']?([^"'\s]+)["']?/);
  if (match) {
    const dir = match[1];
    if (dir.startsWith('./') || !dir.startsWith('/')) {
      return `${ARC_PATH}/${dir.replace('./', '')}`;
    }
    return dir;
  }
  return null;
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

// Fetch result folders from server
async function fetchResultFolders(outputDir: string): Promise<ResultFolder[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/results/folders?output_dir=${encodeURIComponent(outputDir)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.folders || [];
  } catch (error) {
    console.error('Failed to fetch result folders:', error);
    return [];
  }
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Folder download dialog component
function FolderDownloadDialog({
  folders,
  isOpen,
  onClose,
  isJapanese,
}: {
  folders: ResultFolder[];
  isOpen: boolean;
  onClose: () => void;
  isJapanese: boolean;
}) {
  if (!isOpen) return null;

  const handleDownloadZip = (folder: ResultFolder) => {
    const url = `${API_BASE_URL}/download/folder?folder_path=${encodeURIComponent(folder.path)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-600 flex items-center justify-between">
          <h3 className="text-white font-semibold">
            {isJapanese ? '結果フォルダ' : 'Result Folders'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {folders.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              {isJapanese ? 'フォルダが見つかりません' : 'No folders found'}
            </p>
          ) : (
            <div className="space-y-2">
              {folders.map((folder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">📁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{folder.name}</p>
                      <p className="text-slate-400 text-xs">
                        {folder.file_count} {isJapanese ? 'ファイル' : 'files'} • {formatFileSize(folder.total_size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadZip(folder)}
                    className="ml-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    title={isJapanese ? 'ZIPでダウンロード' : 'Download as ZIP'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span className="text-xs font-medium">ZIP</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function StatusBadge({ status, isJapanese }: { status: ExecutionResult['status']; isJapanese: boolean }) {
  const configs = {
    pending: { color: 'bg-slate-600 text-slate-300', label: isJapanese ? '待機中' : 'Pending', icon: '⏳' },
    running: { color: 'bg-blue-900/50 text-blue-300 border border-blue-500/50', label: isJapanese ? '実行中' : 'Running', icon: '🔄' },
    completed: { color: 'bg-green-900/50 text-green-300 border border-green-500/50', label: isJapanese ? '完了' : 'Completed', icon: '✅' },
    error: { color: 'bg-red-900/70 text-red-200 border border-red-500', label: isJapanese ? 'エラー' : 'Error', icon: '❌' },
  };

  const config = configs[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function ResultCard({ result, isJapanese }: { result: ExecutionResult; isJapanese: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [resultFolders, setResultFolders] = useState<ResultFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time for running tasks
  useEffect(() => {
    if (result.status === 'running') {
      const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(interval);
    }
  }, [result.status]);

  const duration = result.endTime
    ? Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)
    : Math.round((currentTime - result.startTime.getTime()) / 1000);

  const featureName = isJapanese ? result.featureNameJa : result.featureNameEn;
  const output = isJapanese ? result.outputJa : result.outputEn;

  const outputDir = extractOutputDir(result.command);
  const jobId = extractJobId(output);

  const handleShowFolders = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!outputDir) return;

    setLoadingFolders(true);
    const folders = await fetchResultFolders(outputDir);
    setResultFolders(folders);
    setLoadingFolders(false);
    setShowFolderDialog(true);
  }, [outputDir]);

  return (
    <>
      <div className={`bg-slate-700 rounded-lg border border-slate-600 overflow-hidden ${result.status === 'running' ? 'ring-2 ring-blue-500/50' : ''}`}>
        <div
          className="p-3 cursor-pointer hover:bg-slate-600/50 flex items-center justify-between transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <StatusBadge status={result.status} isJapanese={isJapanese} />
            <span className="font-medium text-sm text-white">{featureName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{duration}s</span>
            <span>{isExpanded ? '▼' : '▶'}</span>
          </div>
        </div>

        {result.status === 'running' && (
          <div className="px-3 pb-2">
            <ProgressBar progress={result.progress} />
            <p className="text-xs text-blue-400 mt-1 text-center">{result.progress}%</p>
          </div>
        )}

        {isExpanded && (
          <div className="border-t border-slate-600">
            <div className="p-3 bg-slate-800/50">
              <p className="text-xs text-slate-400 mb-1">{isJapanese ? 'コマンド:' : 'Command:'}</p>
              <pre className="text-xs bg-slate-900 text-blue-400 p-2 rounded-lg overflow-x-auto border border-slate-700">
                {result.command}
              </pre>
            </div>

            {output && (
              <div className="p-3">
                <p className="text-xs text-slate-400 mb-1">{isJapanese ? '出力:' : 'Output:'}</p>
                <pre className="text-xs bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap border border-slate-700">
                  {output}
                </pre>
              </div>
            )}

            {/* JOB ID display */}
            {jobId && (
              <div className="p-3 border-t border-slate-600 bg-slate-800/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{isJapanese ? 'JOB ID:' : 'JOB ID:'}</span>
                  <code className="text-xs text-green-400 bg-slate-900 px-2 py-1 rounded font-mono select-all">
                    {jobId}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(jobId);
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                    title={isJapanese ? 'コピー' : 'Copy'}
                  >
                    📋
                  </button>
                </div>
              </div>
            )}

            {/* Result folders download button */}
            {result.status === 'completed' && outputDir && (
              <div className="p-3 border-t border-slate-600">
                <button
                  onClick={handleShowFolders}
                  disabled={loadingFolders}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loadingFolders ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      {isJapanese ? '読み込み中...' : 'Loading...'}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {isJapanese ? '結果フォルダをダウンロード' : 'Download Result Folders'}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <FolderDownloadDialog
        folders={resultFolders}
        isOpen={showFolderDialog}
        onClose={() => setShowFolderDialog(false)}
        isJapanese={isJapanese}
      />
    </>
  );
}

export function ResultPanel({ results, isJapanese }: ResultPanelProps) {
  const [, forceUpdate] = useState(0);

  // Update time every second for running tasks
  useEffect(() => {
    const hasRunning = results.some((r) => r.status === 'running');
    if (hasRunning) {
      const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [results]);

  const handleDownloadAll = useCallback(() => {
    const completedResults = results.filter((r) => r.status === 'completed');
    if (completedResults.length === 0) return;

    const content = completedResults.map((r) => formatResultForDownload(r, isJapanese)).join('\n\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadFile(content, `all_results_${timestamp}.txt`, 'text/plain');
  }, [results, isJapanese]);

  const handleDownloadJSON = useCallback(() => {
    const exportData = results.map((r) => ({
      id: r.id,
      featureId: r.featureId,
      featureName: isJapanese ? r.featureNameJa : r.featureNameEn,
      status: r.status,
      command: r.command,
      output: isJapanese ? r.outputJa : r.outputEn,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime?.toISOString() || null,
    }));
    const content = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadFile(content, `results_${timestamp}.json`, 'application/json');
  }, [results, isJapanese]);

  const completedCount = results.filter((r) => r.status === 'completed').length;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-600 h-full flex flex-col">
      <div className="bg-slate-700 text-white p-4 rounded-t-lg border-b border-slate-600">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>📋</span>
            {isJapanese ? '実行結果' : 'Execution Results'}
          </h2>
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadJSON}
                className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded-lg transition-colors"
                title="JSON"
              >
                JSON
              </button>
              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isJapanese ? '全て' : 'All'}
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-300 mt-1">
          {isJapanese
            ? '計算の進捗と結果がここに表示されます'
            : 'Calculation progress and results will appear here'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
        {results.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <p className="text-4xl mb-2">📊</p>
            <p>{isJapanese ? 'まだ実行結果がありません' : 'No results yet'}</p>
            <p className="text-sm mt-1">
              {isJapanese
                ? '機能を実行すると、ここに結果が表示されます'
                : 'Results will appear here after execution'}
            </p>
          </div>
        ) : (
          results.map((result) => (
            <ResultCard key={result.id} result={result} isJapanese={isJapanese} />
          ))
        )}
      </div>

      {results.length > 0 && (
        <div className="p-3 border-t border-slate-600 bg-slate-700 text-xs text-slate-400 rounded-b-lg">
          {isJapanese ? '合計' : 'Total'}: {results.length} {isJapanese ? '件' : 'tasks'} |
          {' '}{isJapanese ? '完了' : 'Completed'}: {completedCount} |
          {' '}{isJapanese ? '実行中' : 'Running'}: {results.filter((r) => r.status === 'running').length}
        </div>
      )}
    </div>
  );
}
