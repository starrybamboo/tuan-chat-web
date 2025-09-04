import type { CharacterData } from "../types";
import AIGenerationCard from "../components/AIGenerationCard";

interface BasicInfoStepProps {
  characterData: CharacterData;
  aiPrompt: string;
  isGenerating: boolean;
  onCharacterDataChange: (data: Partial<CharacterData>) => void;
  onAiPromptChange: (prompt: string) => void;
  onAIGenerate: () => void;
}

export default function BasicInfoStep({
  characterData,
  aiPrompt,
  isGenerating,
  onCharacterDataChange,
  onAiPromptChange,
  onAIGenerate,
}: BasicInfoStepProps) {
  const NAME_MAX = 32;
  const DESC_MAX = 150;
  return (
    <div className="space-y-6 ">
      <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2 mb-4">
            基础信息设置
          </h3>

          <AIGenerationCard
            title="AI智能生成角色"
            description="描述你的想法，AI将为你创造独特的角色"
            placeholder="描述你想要的角色，例如：一个勇敢的精灵战士，擅长弓箭，有着神秘的过去..."
            prompt={aiPrompt}
            isGenerating={isGenerating}
            onPromptChange={onAiPromptChange}
            onGenerate={onAIGenerate}
          />

          <div className="divider"></div>

          {/* 基础文本信息：纵向布局 */}
          <div className="space-y-6">
            {/* 头像上传 */}
            <div>
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色头像</span>
              </div>
              <div className="flex items-center">
                <div className="w-20 h-20 border-2 border-dashed border-base-content/20 rounded-md flex items-center justify-center">
                  {/* 头像预览 */}
                </div>
              </div>
              <label className="label mt-2">
                <span className="label-text-alt">支持多种表情和姿态的差分图片</span>
              </label>
            </div>

            {/* 角色名 */}
            <div className="form-control">
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色名</span>
                <span className="label-text-alt text-base-content/60">
                  {(characterData.name?.length ?? 0)}
                  /
                  {NAME_MAX}
                </span>
              </div>
              <input
                type="text"
                className="input input-bordered rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="输入角色名称"
                value={characterData.name}
                maxLength={NAME_MAX}
                onChange={e => onCharacterDataChange({ name: e.target.value })}
              />
            </div>

            {/* 角色简介 */}
            <div className="form-control">
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色简介</span>
                <span className="label-text-alt text-base-content/60">
                  {(characterData.description?.length ?? 0)}
                  /
                  {DESC_MAX}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="描述角色的背景故事、性格特点、说话风格等"
                value={characterData.description}
                maxLength={DESC_MAX}
                onChange={e => onCharacterDataChange({ description: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
