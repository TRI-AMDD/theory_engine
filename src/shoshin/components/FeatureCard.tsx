import type { Feature } from '../types';

interface FeatureCardProps {
  feature: Feature;
  onSelect: (feature: Feature) => void;
  isJapanese: boolean;
}

export function FeatureCard({ feature, onSelect, isJapanese }: FeatureCardProps) {
  const name = isJapanese ? feature.nameJa : feature.name;
  const description = isJapanese ? feature.descriptionJa : feature.description;
  const samplePrompt = isJapanese ? feature.samplePromptJa : feature.samplePrompt;

  return (
    <div
      className="bg-slate-800 rounded-xl p-4 cursor-pointer border border-slate-600 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full"
      onClick={() => onSelect(feature)}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{feature.icon}</span>
        <h3 className="text-lg font-semibold text-white">{name}</h3>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 mb-3 flex-grow">
        {description}
      </p>

      {/* Example */}
      <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700 mb-3">
        <p className="text-xs text-slate-400 mb-1">
          {isJapanese ? '入力例:' : 'Example:'}
        </p>
        <p className="text-xs text-blue-400 font-mono line-clamp-2">
          {samplePrompt}
        </p>
      </div>

      {/* Button */}
      <button
        className="w-full py-2 px-4 rounded-lg text-sm mt-auto bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(feature);
        }}
      >
        {isJapanese ? 'この機能を使う' : 'Use this feature'}
      </button>
    </div>
  );
}
