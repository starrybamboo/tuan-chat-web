import type { CharacterData } from "./types";
import { useState } from "react";
import CreatePageHeader from "./components/CreatePageHeader";
import NavigationButtons from "./components/NavigationButtons";
import StepIndicator from "./components/StepIndicator";
import { RULE_SYSTEMS, SAMPLE_ATTRIBUTES, STEPS } from "./constants";
import AttributeStep from "./steps/AttributeStep";
import BasicInfoStep from "./steps/BasicInfoStep";
import RuleSelectionStep from "./steps/RuleSelectionStep";

export default function CreateRoleBySelf({ onBack }: { onBack?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIGenerate = async (section: string) => {
    setIsGenerating(true);
    // 模拟AI生成
    setTimeout(() => {
      if (section === "basic-info") {
        setCharacterData(prev => ({
          ...prev,
          name: "艾莉娅·暗影行者",
          description: "一位来自精灵王国的神秘刺客，擅长潜行和暗杀技巧，背负着复仇的使命。",
        }));
      }
      else if (section === "attributes" && characterData.ruleSystem) {
        const sampleData = SAMPLE_ATTRIBUTES[characterData.ruleSystem as keyof typeof SAMPLE_ATTRIBUTES];
        if (sampleData) {
          setCharacterData(prev => ({
            ...prev,
            ...sampleData,
          }));
        }
      }
      setIsGenerating(false);
    }, 2000);
  };

  const handleRuleSystemChange = (ruleSystem: string) => {
    setCharacterData(prev => ({ ...prev, ruleSystem }));
    // 自动加载该规则系统的默认属性
    const sampleData = SAMPLE_ATTRIBUTES[ruleSystem as keyof typeof SAMPLE_ATTRIBUTES];
    if (sampleData) {
      setCharacterData(prev => ({
        ...prev,
        ...sampleData,
      }));
    }
  };

  const handleCharacterDataChange = (data: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...data }));
  };

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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            characterData={characterData}
            aiPrompt={aiPrompt}
            isGenerating={isGenerating}
            onCharacterDataChange={handleCharacterDataChange}
            onAiPromptChange={setAiPrompt}
            onAIGenerate={() => handleAIGenerate("basic-info")}
          />
        );

      case 2:
        return (
          <RuleSelectionStep
            ruleSystems={RULE_SYSTEMS}
            selectedRuleSystem={characterData.ruleSystem}
            onRuleSystemChange={handleRuleSystemChange}
          />
        );

      case 3:
        return (
          <AttributeStep
            title="角色表演能力"
            attributes={characterData.act}
            aiPrompt={aiPrompt}
            aiPromptPlaceholder="描述角色的表演风格，例如：一个充满魅力的吟游诗人，擅长说服和欺骗..."
            isGenerating={isGenerating}
            onAttributeChange={(key, value) => handleAttributeChange("act", key, value)}
            onAiPromptChange={setAiPrompt}
            onAIGenerate={() => handleAIGenerate("act")}
          />
        );

      case 4:
        return (
          <AttributeStep
            title="基础能力值"
            attributes={characterData.basic}
            aiPrompt={aiPrompt}
            aiPromptPlaceholder="描述角色的身体素质和天赋，例如：一个敏捷的刺客，力量中等但速度极快..."
            isGenerating={isGenerating}
            onAttributeChange={(key, value) => handleAttributeChange("basic", key, value)}
            onAiPromptChange={setAiPrompt}
            onAIGenerate={() => handleAIGenerate("basic")}
          />
        );

      case 5:
        return (
          <AttributeStep
            title="计算能力值"
            attributes={characterData.ability}
            aiPrompt={aiPrompt}
            aiPromptPlaceholder="描述角色的战斗表现，例如：一个坚韧的战士，生命值高，护甲厚重..."
            isGenerating={isGenerating}
            showInfoAlert={true}
            onAttributeChange={(key, value) => handleAttributeChange("ability", key, value)}
            onAiPromptChange={setAiPrompt}
            onAIGenerate={() => handleAIGenerate("ability")}
          />
        );

      case 6:
        return (
          <AttributeStep
            title="技能设定"
            attributes={characterData.skill}
            aiPrompt={aiPrompt}
            aiPromptPlaceholder="描述角色的专业技能，例如：一个博学的法师，精通奥秘知识和历史..."
            isGenerating={isGenerating}
            onAttributeChange={(key, value) => handleAttributeChange("skill", key, value)}
            onAiPromptChange={setAiPrompt}
            onAIGenerate={() => handleAIGenerate("skill")}
          />
        );

      default:
        return null;
    }
  };

  const handleComplete = () => {
    // Character creation completed
    // 这里可以添加保存逻辑或跳转到展示页面
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部导航 */}
      <CreatePageHeader
        title="逐步自主创建"
        description="手动填写角色信息，完全自定义角色的每一个细节"
        onBack={onBack}
      />

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* 步骤内容 */}
      <div className="mb-8">{renderStepContent()}</div>

      {/* 底部按钮 */}
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={STEPS.length}
        canProceed={currentStep !== 2 || !!characterData.ruleSystem}
        onPrevious={() => setCurrentStep(Math.max(1, currentStep - 1))}
        onNext={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
        onComplete={handleComplete}
      />
    </div>
  );
}
