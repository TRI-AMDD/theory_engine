import { useState, useCallback, useRef } from 'react';
import type { Feature, ExecutionConfig, StructureFile } from '../types';

const UPLOAD_URL = 'http://localhost:8081/upload';

interface ExecutionDialogProps {
  feature: Feature | null;
  config: ExecutionConfig | null;
  currentStructure: StructureFile | null;
  onConfirm: () => void;
  onCancel: () => void;
  onEdit: (key: string, value: string | number) => void;
  isJapanese: boolean;
}

// Parameters that are structure-related
const STRUCTURE_PARAMS = ['structure', 'trajectory', 'structure_list', 'initial_structure', 'final_structure'];

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

export function ExecutionDialog({
  feature,
  config,
  currentStructure,
  onConfirm,
  onCancel,
  onEdit,
  isJapanese,
}: ExecutionDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileUpload = useCallback(async (file: File, paramName: string) => {
    setIsUploading(true);
    try {
      const serverPath = await uploadFileToServer(file);
      onEdit(paramName, serverPath);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(isJapanese ? 'ファイルのアップロードに失敗しました' : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  }, [onEdit, isJapanese]);

  const handleDrop = useCallback(async (e: React.DragEvent, paramName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0], paramName);
      return;
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      onEdit(paramName, text);
    }
  }, [onEdit, handleFileUpload]);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, paramName: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0], paramName);
    }
  }, [handleFileUpload]);

  if (!feature || !config) return null;

  // Separate structure params from other params
  const structureParams = feature.parameters.filter(p => STRUCTURE_PARAMS.includes(p.name));
  const otherParams = feature.parameters.filter(p => !STRUCTURE_PARAMS.includes(p.name));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-600">
        <div className="bg-slate-700 text-white p-4 rounded-t-xl border-b border-slate-600">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>{feature.icon}</span>
            {isJapanese ? '実行確認' : 'Confirm Execution'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            {isJapanese ? feature.nameJa : feature.name}
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Current Structure Info */}
          {currentStructure && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-green-300 mb-1">
                {isJapanese ? 'チャットで指定された構造' : 'Structure from Chat'}
              </h3>
              <div className="text-sm text-green-200">
                <span className="mr-2">📁 {currentStructure.name}</span>
                {currentStructure.formula && (
                  <span className="text-green-300/70">({currentStructure.formula})</span>
                )}
              </div>
            </div>
          )}

          {/* Structure File Input */}
          {structureParams.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">
                {isJapanese ? '構造ファイル' : 'Structure File'}
                {isUploading && (
                  <span className="ml-2 text-xs text-blue-400 animate-pulse">
                    {isJapanese ? 'アップロード中...' : 'Uploading...'}
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {structureParams.map((param) => (
                  <div key={param.name} className="flex items-center gap-4">
                    <label className="w-1/3 text-sm text-slate-300">
                      {isJapanese ? param.nameJa : param.name}
                    </label>
                    <div
                      className={`flex-1 relative ${isDragging ? 'ring-2 ring-blue-500' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, param.name)}
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={config.parameters[param.name] ?? (currentStructure?.path || param.default)}
                          onChange={(e) => onEdit(param.name, e.target.value)}
                          className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={isJapanese ? 'ファイルパスを入力またはドラッグ＆ドロップ' : 'Enter file path or drag & drop'}
                          disabled={isUploading}
                        />
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".cif,.vasp,.xyz,.poscar,.traj,.zip,.txt,.list"
                          onChange={(e) => handleFileInputChange(e, param.name)}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white rounded-lg text-sm transition-colors"
                        >
                          {isJapanese ? '参照' : 'Browse'}
                        </button>
                      </div>
                      {isDragging && (
                        <div className="absolute inset-0 bg-blue-900/80 rounded-lg flex items-center justify-center">
                          <span className="text-blue-200 text-sm">
                            {isJapanese ? 'ドロップ' : 'Drop'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {isJapanese
                  ? '対応形式: .cif, .vasp, .xyz, .poscar, .traj, .zip, .txt'
                  : 'Supported formats: .cif, .vasp, .xyz, .poscar, .traj, .zip, .txt'}
              </p>
            </div>
          )}

          {/* Other Parameters */}
          {otherParams.length > 0 && (
            <div>
              <h3 className="font-semibold text-white mb-2">
                {isJapanese ? 'パラメータ' : 'Parameters'}
              </h3>
              <div className="space-y-3">
                {otherParams.map((param) => (
                  <div key={param.name} className="flex items-center gap-4">
                    <label className="w-1/3 text-sm text-slate-300">
                      {isJapanese ? param.nameJa : param.name}
                      {param.unit && <span className="text-slate-500 ml-1">({param.unit})</span>}
                    </label>
                    {param.type === 'select' ? (
                      <select
                        value={config.parameters[param.name] ?? param.default}
                        onChange={(e) => onEdit(param.name, e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {param.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={param.type === 'number' ? 'number' : 'text'}
                        value={config.parameters[param.name] ?? param.default}
                        onChange={(e) => onEdit(param.name, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={param.description}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-white mb-2">
              {isJapanese ? '実行コマンド' : 'Execution Command'}
            </h3>
            <pre className="bg-slate-900 text-blue-400 p-4 rounded-lg text-sm overflow-x-auto font-mono border border-slate-700">
              {config.command}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-600 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white"
          >
            {isJapanese ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {isJapanese ? '実行する' : 'Execute'}
          </button>
        </div>
      </div>
    </div>
  );
}
