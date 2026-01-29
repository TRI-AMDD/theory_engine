import type { Feature } from '../types';
import { FeatureCard } from './FeatureCard';

interface FeatureGridProps {
  features: Feature[];
  batchFeatures?: Feature[];
  onSelectFeature: (feature: Feature) => void;
  isJapanese: boolean;
}

export function FeatureGrid({ features, batchFeatures, onSelectFeature, isJapanese }: FeatureGridProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Single Structure Features */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🔹</span>
          {isJapanese ? '単一構造の計算' : 'Single Structure Calculations'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          {isJapanese
            ? '1つの構造ファイルに対して計算を実行します。初めての方はこちらから始めてください。'
            : 'Run calculations on a single structure file. Start here if you are new.'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onSelect={onSelectFeature}
              isJapanese={isJapanese}
            />
          ))}
        </div>
      </div>

      {/* Batch Features */}
      {batchFeatures && batchFeatures.length > 0 && (
        <div className="border-t border-slate-600 pt-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📦</span>
            {isJapanese ? 'バッチ処理（複数構造の一括計算）' : 'Batch Processing (Multiple Structures)'}
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            {isJapanese
              ? '複数の構造ファイルに対して一括で計算を実行します。大規模スクリーニングや系統的な解析に最適です。'
              : 'Run calculations on multiple structure files at once. Ideal for large-scale screening and systematic analysis.'}
          </p>
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-200">
              <span className="font-semibold">💡 {isJapanese ? 'ヒント' : 'Tip'}:</span>{' '}
              {isJapanese
                ? '構造リストファイルは、1行に1つの構造ファイルパスを記載したテキストファイルです。'
                : 'The structure list file is a text file with one structure file path per line.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                onSelect={onSelectFeature}
                isJapanese={isJapanese}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
