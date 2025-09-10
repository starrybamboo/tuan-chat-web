import AIGenerationCard from "../components/AIGenerationCard";
import AttributeEditor from "../components/AttributeEditor";

interface AttributeStepProps {
  title: string;
  attributes: Record<string, string>;
  aiPrompt: string;
  aiPromptPlaceholder: string;
  isGenerating: boolean;
  showInfoAlert?: boolean;
  onAttributeChange: (key: string, value: string) => void;
  onAiPromptChange: (prompt: string) => void;
  onAIGenerate: () => void;
}

export default function AttributeStep({
  title,
  attributes,
  aiPrompt,
  aiPromptPlaceholder,
  isGenerating,
  showInfoAlert = false,
  onAttributeChange,
  onAiPromptChange,
  onAIGenerate,
}: AttributeStepProps) {
  return (
    <div className="space-y-6">
      <AIGenerationCard
        title={`AI智能生成 ${title}`}
        description="让AI为你快速生成合理的数值配置"
        placeholder={aiPromptPlaceholder}
        prompt={aiPrompt}
        isGenerating={isGenerating}
        onPromptChange={onAiPromptChange}
        onGenerate={onAIGenerate}
      />

      <AttributeEditor
        title={title}
        attributes={attributes}
        onChange={onAttributeChange}
      />

      {showInfoAlert && (
        <div className="alert alert-info">
          <span>💡 这些数值通常根据基础能力自动计算，你也可以手动调整</span>
        </div>
      )}
    </div>
  );
}
