import { useState } from 'react';
import { ChatBox } from './components/ChatBox';
import { FeatureGrid } from './components/FeatureGrid';
import { ExecutionDialog } from './components/ExecutionDialog';
import { ResultPanel } from './components/ResultPanel';
import { useShoshin } from './hooks/useShoshin';
import { features, batchFeatures } from './data/features';

interface ShoshinPanelProps {
  onClose?: () => void;
}

export function ShoshinPanel({ onClose }: ShoshinPanelProps) {
  const [isJapanese, setIsJapanese] = useState(false);
  const {
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
    showDialog,
  } = useShoshin();

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">Shoshin</h1>
          <span className="text-sm text-slate-400">Matlantis Calculation Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJapanese(!isJapanese)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
          >
            {isJapanese ? 'EN' : 'JP'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Chat and Features */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Chat Section */}
          <ChatBox
            messages={messages}
            onSendMessage={sendMessage}
            onStructureUpload={handleStructureUpload}
            onExecute={executeCalculation}
            isLoading={isLoading}
            isJapanese={isJapanese}
            conversationState={conversationState}
            currentStructure={currentStructure}
          />

          {/* Features Section */}
          <div className="bg-slate-800 rounded-lg border border-slate-600">
            <FeatureGrid
              features={features}
              batchFeatures={batchFeatures}
              onSelectFeature={selectFeature}
              isJapanese={isJapanese}
            />
          </div>

          {/* Help Section */}
          <div className="bg-slate-800 rounded-lg border border-slate-600 p-4">
            <h3 className="font-semibold text-white mb-3">
              {isJapanese ? '💡 使い方のヒント' : '💡 Tips'}
            </h3>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>
                {isJapanese
                  ? '• チャットボックスにやりたいことを自然な言葉で入力してください'
                  : '• Type what you want to do in natural language in the chat box'}
              </li>
              <li>
                {isJapanese
                  ? '• または下の機能カードをクリックして直接設定できます'
                  : '• Or click on feature cards below to configure directly'}
              </li>
              <li>
                {isJapanese
                  ? '• AIが内容を解釈し、実行に必要なパラメータを確認します'
                  : '• AI will interpret your request and confirm the parameters'}
              </li>
              <li>
                {isJapanese
                  ? '• 確認後、実行ボタンをクリックすると計算が開始されます'
                  : '• After confirmation, click execute to start the calculation'}
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column - Results Panel */}
        <div className="w-96 border-l border-slate-600 flex-shrink-0">
          <ResultPanel
            results={executionResults}
            isJapanese={isJapanese}
          />
        </div>
      </div>

      {/* Execution Dialog */}
      {showDialog && (
        <ExecutionDialog
          feature={selectedFeature}
          config={pendingConfig}
          currentStructure={currentStructure}
          onConfirm={confirmExecution}
          onCancel={cancelExecution}
          onEdit={updateConfig}
          isJapanese={isJapanese}
        />
      )}
    </div>
  );
}
