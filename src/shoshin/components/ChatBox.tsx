import { useState, useRef, useCallback } from 'react';
import type { Message, StructureFile, ConversationState } from '../types';

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onStructureUpload: (fileOrPath: File | string) => void;
  onExecute: () => void;
  isLoading: boolean;
  isJapanese: boolean;
  conversationState: ConversationState;
  currentStructure: StructureFile | null;
}

export function ChatBox({
  messages,
  onSendMessage,
  onStructureUpload,
  onExecute,
  isLoading,
  isJapanese,
  conversationState,
  currentStructure,
}: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onStructureUpload(files[0]);
      return;
    }

    const text = e.dataTransfer.getData('text/plain');
    if (text && text.match(/\.(cif|vasp|xyz|poscar|zip|txt|list)$/i)) {
      onStructureUpload(text);
    }
  }, [onStructureUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onStructureUpload(files[0]);
    }
  }, [onStructureUpload]);

  return (
    <div
      className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="bg-slate-700 p-4 border-b border-slate-600">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <span>💬</span>
          {isJapanese ? 'Shoshin アシスタント' : 'Shoshin Assistant'}
        </h2>
        <p className="text-sm text-slate-300 mt-1">
          {isJapanese
            ? 'やりたいことを自然な言葉で入力してください。AIがお手伝いします。'
            : 'Describe what you want to do in natural language. AI will help you.'}
        </p>
      </div>

      {/* Structure status bar */}
      {currentStructure && (
        <div className="px-4 py-2 bg-green-900/30 border-b border-green-500/30 flex items-center gap-2">
          <span className="text-green-400">📁</span>
          <span className="text-sm text-green-300">{currentStructure.name}</span>
          {currentStructure.formula && (
            <span className="text-xs text-green-400/70">({currentStructure.formula})</span>
          )}
        </div>
      )}

      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-slate-900/50 relative">
        {/* Initial structure upload prompt */}
        {messages.length === 0 && conversationState === 'waiting_structure' && (
          <div className="text-center py-8">
            <div
              className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-slate-500 hover:border-blue-500/50 hover:bg-slate-800/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-5xl mb-4">📁</p>
              <p className="text-white font-medium mb-2">
                {isJapanese
                  ? 'まず、計算する構造ファイルを指定してください'
                  : 'First, specify a structure file to calculate'}
              </p>
              <p className="text-slate-400 text-sm mb-4">
                {isJapanese
                  ? 'ドラッグ＆ドロップまたはクリックしてファイルを選択'
                  : 'Drag & drop or click to select a file'}
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                <span className="bg-slate-700 px-2 py-1 rounded">.cif</span>
                <span className="bg-slate-700 px-2 py-1 rounded">.vasp</span>
                <span className="bg-slate-700 px-2 py-1 rounded">.xyz</span>
                <span className="bg-slate-700 px-2 py-1 rounded">.poscar</span>
                <span className="bg-slate-700 px-2 py-1 rounded">.zip</span>
                <span className="bg-slate-700 px-2 py-1 rounded">.txt</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".cif,.vasp,.xyz,.poscar,.zip,.txt,.list"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 border border-slate-600 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {/* Execute button in message */}
              {message.executionReady && (
                <div className="mt-3 pt-3 border-t border-slate-500/50">
                  <div className="bg-slate-900 rounded-lg p-2 mb-3 text-xs font-mono text-blue-400 overflow-x-auto">
                    {message.executionReady.command}
                  </div>
                  <button
                    onClick={onExecute}
                    className="w-full py-2 rounded-lg flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <span>🚀</span>
                    {isJapanese ? '実行' : 'Execute'}
                  </button>
                </div>
              )}

              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 border border-slate-600 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-slate-300">
                  {isJapanese ? '考え中...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-900/80 flex items-center justify-center z-10">
            <div className="text-center">
              <p className="text-4xl mb-2">📁</p>
              <p className="text-blue-200 font-medium">
                {isJapanese ? 'ファイルをドロップ' : 'Drop file here'}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-600">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              conversationState === 'waiting_structure'
                ? (isJapanese ? '構造ファイルのパスを入力...' : 'Enter structure file path...')
                : conversationState === 'waiting_param_confirm'
                ? (isJapanese ? '「はい」で実行、または「temperature: 500」のようにパラメータを変更...' : '"OK" to execute, or change params like "temperature: 500"...')
                : (isJapanese ? '例: 500KでMDシミュレーションを実行したい...' : 'Example: Run MD simulation at 500K...')
            }
            className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
          >
            {isJapanese ? '送信' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
