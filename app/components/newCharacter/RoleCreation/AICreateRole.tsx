import type { CharacterData } from "./types";
import { useState } from "react";
import AIGenerationCard from "./components/AIGenerationCard";
import AttributeEditor from "./components/AttributeEditor";
import { RULE_SYSTEMS, SAMPLE_ATTRIBUTES } from "./constants";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: CharacterData) => void;
}

/**
 * AI智能创建角色组件
 * 通过AI辅助，一站式完成角色创建
 */
export default function AICreateRole({ onBack, onComplete }: AICreateRoleProps) {
  // 角色数据状态
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "",
    description: "",
    avatar: "",
    ruleSystem: "",
    act: {},
    basic: {},
    ability: {},
    skill: {},
  });

  // AI相关状态
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>("");

  // 表单验证
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 常量
  const NAME_MAX = 32;
  const DESC_MAX = 300;

  // 检查是否可以保存
  const canSave = characterData.name.trim()
    && characterData.description.trim()
    && characterData.ruleSystem;

  // 处理规则系统变更
  const handleRuleSystemChange = (ruleSystemId: string) => {
    setCharacterData(prev => ({ ...prev, ruleSystem: ruleSystemId }));

    // 自动加载该规则系统的默认属性
    const sampleData = SAMPLE_ATTRIBUTES[ruleSystemId as keyof typeof SAMPLE_ATTRIBUTES];
    if (sampleData) {
      setCharacterData(prev => ({
        ...prev,
        ...sampleData,
      }));
    }
  };

  // 处理基础信息变更
  const handleBasicInfoChange = (field: string, value: string) => {
    setCharacterData(prev => ({ ...prev, [field]: value }));

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // 处理属性变更
  const handleAttributeChange = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: number | string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // AI生成处理
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim())
      return;

    setIsGenerating(true);
    setCurrentGenerationStep("基础信息");

    try {
      // 模拟AI生成过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 生成基础信息
      setCurrentGenerationStep("生成基础信息...");
      await new Promise(resolve => setTimeout(resolve, 1500));

      setCharacterData(prev => ({
        ...prev,
        name: generateNameFromPrompt(aiPrompt),
        description: generateDescriptionFromPrompt(aiPrompt),
      }));

      // 如果已选择规则系统，生成属性
      if (characterData.ruleSystem) {
        setCurrentGenerationStep("生成角色属性...");
        await new Promise(resolve => setTimeout(resolve, 1500));

        const sampleData = SAMPLE_ATTRIBUTES[characterData.ruleSystem as keyof typeof SAMPLE_ATTRIBUTES];
        if (sampleData) {
          setCharacterData(prev => ({
            ...prev,
            ...generateAttributesFromPrompt(aiPrompt, sampleData),
          }));
        }
      }
    }
    catch (error) {
      console.error("AI生成失败:", error);
    }
    finally {
      setIsGenerating(false);
      setCurrentGenerationStep("");
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!characterData.name.trim()) {
      newErrors.name = "角色名称不能为空";
    }

    if (!characterData.description.trim()) {
      newErrors.description = "角色描述不能为空";
    }

    if (!characterData.ruleSystem) {
      newErrors.ruleSystem = "请选择规则系统";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存角色
  const handleSave = () => {
    if (validateForm()) {
      onComplete?.(characterData);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        {onBack && (
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            ← 返回
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">AI智能创建角色</h1>
          <p className="text-base-content/70">
            描述你的想法，AI将帮你创建完整的角色
            {currentGenerationStep && (
              <span className="ml-2 text-primary">
                {currentGenerationStep}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* AI生成卡片 */}
        <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
          <div className="card-body">
            <AIGenerationCard
              title="描述你的角色想法"
              description="详细描述角色的背景、性格、能力特点，AI会根据描述生成完整的角色信息"
              placeholder="例如：一个来自北方的勇敢战士，擅长双手剑，有着保护弱者的坚定信念，曾经是皇家骑士团的成员..."
              prompt={aiPrompt}
              isGenerating={isGenerating}
              onPromptChange={setAiPrompt}
              onGenerate={handleAIGenerate}
            />
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：规则选择 */}
          <div className="lg:col-span-1">
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10 sticky top-6">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">⚙️ 规则系统</h3>
                <div className="space-y-3">
                  {RULE_SYSTEMS.map(rule => (
                    <div
                      key={rule.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        characterData.ruleSystem === rule.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-base-300 hover:border-base-400 hover:bg-base-50"
                      }`}
                      onClick={() => handleRuleSystemChange(rule.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{rule.name}</h4>
                          <p className="text-xs text-base-content/60 mt-1">
                            {rule.description}
                          </p>
                        </div>
                        {characterData.ruleSystem === rule.id && (
                          <div className="badge badge-primary badge-xs">✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {errors.ruleSystem && (
                  <div className="text-error text-sm mt-2">{errors.ruleSystem}</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：基础信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基础信息 */}
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
              <div className="card-body">
                <h3 className="card-title text-lg mb-4">📝 基础信息</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 头像上传 */}
                  <div className="md:col-span-2">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色头像</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 border-2 border-dashed border-base-content/20 rounded-md flex items-center justify-center">
                        <svg className="w-8 h-8 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <div className="text-sm text-base-content/60">
                        点击上传或拖拽图片到此处
                        <br />
                        支持 JPG、PNG 格式
                      </div>
                    </div>
                    <div className="text-xs text-base-content/60 mt-2">
                      支持多种表情和姿态的差分图片
                    </div>
                  </div>

                  {/* 角色名 */}
                  <div className="form-control">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色名称</span>
                      <span className="label-text-alt text-base-content/60">
                        {characterData.name.length}
                        /
                        {NAME_MAX}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={`input input-bordered rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? "input-error" : ""}`}
                      placeholder="输入角色名称"
                      value={characterData.name}
                      maxLength={NAME_MAX}
                      onChange={e => handleBasicInfoChange("name", e.target.value)}
                    />
                    {errors.name && (
                      <div className="text-error text-sm mt-1">{errors.name}</div>
                    )}
                  </div>

                  {/* 角色描述 */}
                  <div className="form-control md:col-span-2">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色描述</span>
                      <span className="label-text-alt text-base-content/60">
                        {characterData.description.length}
                        /
                        {DESC_MAX}
                      </span>
                    </div>
                    <textarea
                      className={`textarea textarea-bordered rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.description ? "textarea-error" : ""}`}
                      placeholder="描述角色的背景故事、性格特点、外貌特征等..."
                      value={characterData.description}
                      maxLength={DESC_MAX}
                      onChange={e => handleBasicInfoChange("description", e.target.value)}
                    />
                    {errors.description && (
                      <div className="text-error text-sm mt-1">{errors.description}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 角色属性 - 只有在选择规则系统后才显示 */}
        {characterData.ruleSystem && (
          <div className="space-y-6">
            {/* 角色表演能力 */}
            <AttributeEditor
              title="角色表演能力"
              attributes={characterData.act}
              onChange={(key, value) => handleAttributeChange("act", key, value)}
            />

            {/* 基础能力值 */}
            <AttributeEditor
              title="基础能力值"
              attributes={characterData.basic}
              onChange={(key, value) => handleAttributeChange("basic", key, value)}
            />

            {/* 计算能力值 */}
            <AttributeEditor
              title="计算能力值"
              attributes={characterData.ability}
              onChange={(key, value) => handleAttributeChange("ability", key, value)}
            />

            {/* 技能设定 */}
            <AttributeEditor
              title="技能设定"
              attributes={characterData.skill}
              onChange={(key, value) => handleAttributeChange("skill", key, value)}
            />
          </div>
        )}
        {" "}
        {/* 底部操作按钮 */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-base-content/60">
            {canSave ? "角色信息完整，可以保存" : "请完善必填信息"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCharacterData({
                  name: "",
                  description: "",
                  avatar: "",
                  ruleSystem: "",
                  act: {},
                  basic: {},
                  ability: {},
                  skill: {},
                });
                setAiPrompt("");
                setErrors({});
              }}
            >
              重置
            </button>
            <button
              type="button"
              className={`btn btn-primary ${!canSave ? "btn-disabled" : ""}`}
              onClick={handleSave}
              disabled={!canSave}
            >
              保存角色
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 辅助函数：从提示词生成角色名
function generateNameFromPrompt(prompt: string): string {
  // 简单的名称生成逻辑，实际应该调用AI接口
  const keywords = prompt.toLowerCase();
  if (keywords.includes("战士") || keywords.includes("骑士")) {
    return "艾登·钢铁之心";
  }
  else if (keywords.includes("法师") || keywords.includes("魔法")) {
    return "莉雅娜·星辉";
  }
  else if (keywords.includes("盗贼") || keywords.includes("刺客")) {
    return "影刃·夜行者";
  }
  else if (keywords.includes("牧师") || keywords.includes("治疗")) {
    return "伊莲娜·光明";
  }
  return "神秘冒险者";
}

// 辅助函数：从提示词生成描述
function generateDescriptionFromPrompt(prompt: string): string {
  // 简单的描述生成逻辑，实际应该调用AI接口
  return `根据您的描述生成的角色：${prompt.slice(0, 100)}...这是一个充满故事的角色，拥有独特的背景和鲜明的个性特点。`;
}

// 辅助函数：从提示词生成属性
function generateAttributesFromPrompt(prompt: string, baseAttributes: any) {
  // 简单的属性生成逻辑，实际应该调用AI接口
  const result = { ...baseAttributes };

  // 根据关键词调整属性
  const keywords = prompt.toLowerCase();

  if (keywords.includes("强壮") || keywords.includes("战士")) {
    if (result.basic?.力量)
      result.basic.力量 += 2;
    if (result.basic?.体质)
      result.basic.体质 += 1;
  }

  if (keywords.includes("敏捷") || keywords.includes("快速")) {
    if (result.basic?.敏捷)
      result.basic.敏捷 += 2;
  }

  if (keywords.includes("聪明") || keywords.includes("智慧")) {
    if (result.basic?.智力)
      result.basic.智力 += 2;
  }

  return result;
}
