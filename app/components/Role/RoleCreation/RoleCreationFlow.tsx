import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";
import type { CharacterData } from "./types";
import type { SetSelectedRoleIdFn } from "./utils/roleCreationHelpers";

import {
  useGenerateAbilityByRuleMutation,
  useGenerateBasicInfoByRuleMutation,
  useSetRoleAbilityMutation,
} from "api/hooks/abilityQueryHooks";
import {
  useCreateRoleMutation,
  useUpdateRoleWithLocalMutation,
  useUploadAvatarMutation,
} from "api/queryHooks";
import { useState } from "react";
import Section from "../Editors/Section";
import RulesSection from "../rules/RulesSection";
import { AI_STEPS, ST_STEPS, STEPS } from "./constants";
import RoleCreationLayout from "./RoleCreationLayout";
import AIGenerationCard from "./steps/AIGenerationCard";
import AttributeEditor from "./steps/AttributeEditor";
import AttributeStep from "./steps/AttributeStep";
import BasicInfoStep from "./steps/BasicInfoStep";
import STImportStep from "./steps/STImportStep";
import { completeRoleCreation, evaluateCharacterDataExpressions } from "./utils/roleCreationHelpers";
// import { completeRoleCreation } from "./utils/roleCreationHelpers";
import { useCharacterData } from "./utils/useCharacterData";

export type RoleCreationMode = "self" | "AI" | "ST";

interface RoleCreationFlowProps {
  mode: RoleCreationMode;
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: SetSelectedRoleIdFn;
  onSave?: (updatedRole: Role) => void;
}

const MODE_META: Record<RoleCreationMode, { title: string; description: string; steps: typeof STEPS }> = {
  self: {
    title: "逐步自主创建",
    description: "手动填写角色信息，完全自定义角色的每一个细节",
    steps: STEPS,
  },
  AI: {
    title: "AI智能创建角色",
    description: "通过AI辅助，分步完成角色创建",
    steps: AI_STEPS,
  },
  ST: {
    title: "ST指令创建角色",
    description: "通过ST指令快速导入角色属性",
    steps: ST_STEPS,
  },
};

export default function RoleCreationFlow({
  mode,
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
}: RoleCreationFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const {
    characterData,
    setCharacterData,
    selectedRuleId,
    isValidRuleId,
    handleCharacterDataChange,
    handleAttributeChange,
    handleAddField,
    handleDeleteField,
    handleRenameField,
    handleRuleChange,
  } = useCharacterData();

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hasImported, setHasImported] = useState(false);

  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => { }));
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();

  const { title, description, steps } = MODE_META[mode];

  const hasBasicInfo = characterData.name.trim().length > 0 && characterData.description.trim().length > 0;
  const hasRule = characterData.ruleId > 0;

  let canProceedCurrent = true;
  if (currentStep === 1)
    canProceedCurrent = hasBasicInfo;
  else if (currentStep === 2)
    canProceedCurrent = hasRule;
  else if (mode === "AI" && currentStep === 3)
    canProceedCurrent = hasGenerated;
  else if (mode === "ST" && currentStep === 4)
    canProceedCurrent = hasImported;

  const handleAIGenerate = async () => {
    if (mode !== "AI")
      return;
    if (!aiPrompt.trim() || !isValidRuleId)
      return;

    setIsGenerating(true);

    try {
      const ruleId = selectedRuleId;

      await new Promise((resolve) => {
        generateBasicInfoByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                const actData: Record<string, string> = {};
                Object.entries(data.data).forEach(([key, value]) => {
                  actData[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
                });
                setCharacterData(prev => ({
                  ...prev,
                  act: { ...prev.act, ...actData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成角色表演能力失败:", error);
              resolve(null);
            },
          },
        );
      });

      await new Promise((resolve) => {
        generateAbilityByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                const responseData = data.data;
                const basicData: Record<string, string> = {};
                if (responseData.basic) {
                  Object.entries(responseData.basic).forEach(([key, value]) => {
                    basicData[key] = String(value);
                  });
                }
                const abilityData: Record<string, string> = {};
                if (responseData.属性 || responseData.ability) {
                  const abilitySource = responseData.属性 || responseData.ability;
                  Object.entries(abilitySource).forEach(([key, value]) => {
                    abilityData[key] = String(value);
                  });
                }
                const skillData: Record<string, string> = {};
                if (responseData.技能 || responseData.skill) {
                  const skillSource = responseData.技能 || responseData.skill;
                  Object.entries(skillSource).forEach(([key, value]) => {
                    skillData[key] = String(value);
                  });
                }
                setCharacterData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, ...basicData },
                  ability: { ...prev.ability, ...abilityData },
                  skill: { ...prev.skill, ...skillData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成能力数据失败:", error);
              resolve(null);
            },
          },
        );
      });

      setHasGenerated(true);
    }
    catch (error) {
      console.error("AI生成失败:", error);
    }
    finally {
      setIsGenerating(false);
    }
  };

  const handleImportSuccess = (importedData: Partial<CharacterData>) => {
    if (mode !== "ST")
      return;

    setCharacterData(prev => ({
      ...prev,
      ...importedData,
    }));
    setHasImported(true);
  };

  const handleComplete = async () => {
    if (isSaving)
      return;
    if (!characterData.name.trim() || !characterData.description.trim() || characterData.ruleId <= 0)
      return;

    setIsSaving(true);
    try {
      await completeRoleCreation(
        {
          characterData,
          createRole,
          uploadAvatar,
          setRoleAbility,
          updateRole,
          setRoles,
          setSelectedRoleId,
          onComplete,
        },
        {
          beforeSetRoleAbility: evaluateCharacterDataExpressions,
        },
      );
    }
    catch (error) {
      console.error("创建角色失败", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  const renderActSection = () => (
    <Section title="角色表演能力" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
      <AttributeEditor
        title="角色表演能力"
        attributes={characterData.act}
        onChange={(key: string, value: string) => handleAttributeChange("act", key, value)}
        onAddField={(key: string, value: string) => handleAddField("act", key, value)}
        onDeleteField={(key: string) => handleDeleteField("act", key)}
        onRenameField={(oldKey: string, newKey: string) => handleRenameField("act", oldKey, newKey)}
      />
    </Section>
  );

  const renderBasicAndAbilitySections = () => (
    <>
      <Section title="基础属性配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100 mb-6">
        <AttributeEditor
          title="基础能力值"
          attributes={characterData.basic}
          onChange={(key: string, value: string) => handleAttributeChange("basic", key, value)}
          onAddField={(key: string, value: string) => handleAddField("basic", key, value)}
          onDeleteField={(key: string) => handleDeleteField("basic", key)}
          onRenameField={(oldKey: string, newKey: string) => handleRenameField("basic", oldKey, newKey)}
        />
      </Section>
      <Section title="能力配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
        <AttributeEditor
          title="计算能力值"
          attributes={characterData.ability}
          onChange={(key: string, value: string) => handleAttributeChange("ability", key, value)}
          onAddField={(key: string, value: string) => handleAddField("ability", key, value)}
          onDeleteField={(key: string) => handleDeleteField("ability", key)}
          onRenameField={(oldKey: string, newKey: string) => handleRenameField("ability", oldKey, newKey)}
        />
      </Section>
    </>
  );

  const renderSkillSection = () => (
    <Section title="技能设定" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
      <AttributeEditor
        title="技能设定"
        attributes={characterData.skill}
        onChange={(key: string, value: string) => handleAttributeChange("skill", key, value)}
        onAddField={(key: string, value: string) => handleAddField("skill", key, value)}
        onDeleteField={(key: string) => handleDeleteField("skill", key)}
        onRenameField={(oldKey: string, newKey: string) => handleRenameField("skill", oldKey, newKey)}
      />
    </Section>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep characterData={characterData} onCharacterDataChange={handleCharacterDataChange} />
        );
      case 2:
        return (
          <RulesSection large currentRuleId={characterData.ruleId} onRuleChange={handleRuleChange} />
        );
      default:
        break;
    }

    if (mode === "AI") {
      switch (currentStep) {
        case 3:
          return (
            <AIGenerationCard
              title="描述你的角色想法"
              description="详细描述角色的背景、性格、能力特点，AI会根据描述生成完整的角色信息"
              placeholder="例如：一个来自北方的勇敢战士，擅长双手剑，有着保护弱者的坚定信念，曾经是皇家骑士团的成员..."
              prompt={aiPrompt}
              isGenerating={isGenerating}
              disabled={false}
              onPromptChange={setAiPrompt}
              onGenerate={handleAIGenerate}
            />
          );
        case 4:
          return renderActSection();
        case 5:
          return renderBasicAndAbilitySections();
        case 6:
          return renderSkillSection();
        default:
          return null;
      }
    }

    if (mode === "ST") {
      switch (currentStep) {
        case 3:
          return renderActSection();
        case 4:
          return (
            <STImportStep
              ruleId={characterData.ruleId}
              characterData={characterData}
              onImportSuccess={handleImportSuccess}
            />
          );
        case 5:
          return renderBasicAndAbilitySections();
        case 6:
          return renderSkillSection();
        default:
          return null;
      }
    }

    // self mode
    switch (currentStep) {
      case 3:
        return (
          <AttributeStep
            title="角色表演能力"
            attributes={characterData.act}
            onAttributeChange={(key, value) => handleAttributeChange("act", key, value)}
            onAddField={(key, value) => handleAddField("act", key, value)}
            onDeleteField={key => handleDeleteField("act", key)}
            onRenameField={(oldKey, newKey) => handleRenameField("act", oldKey, newKey)}
          />
        );
      case 4:
        return (
          <>
            <AttributeStep
              title="基础能力值"
              attributes={characterData.basic}
              onAttributeChange={(key, value) => handleAttributeChange("basic", key, value)}
              onAddField={(key, value) => handleAddField("basic", key, value)}
              onDeleteField={key => handleDeleteField("basic", key)}
              onRenameField={(oldKey, newKey) => handleRenameField("basic", oldKey, newKey)}
            />
            <div className="mt-6">
              <AttributeStep
                title="计算能力值"
                attributes={characterData.ability}
                showInfoAlert
                onAttributeChange={(key, value) => handleAttributeChange("ability", key, value)}
                onAddField={(key, value) => handleAddField("ability", key, value)}
                onDeleteField={key => handleDeleteField("ability", key)}
                onRenameField={(oldKey, newKey) => handleRenameField("ability", oldKey, newKey)}
              />
            </div>
          </>
        );
      case 5:
        return (
          <AttributeStep
            title="技能设定"
            attributes={characterData.skill}
            onAttributeChange={(key, value) => handleAttributeChange("skill", key, value)}
            onAddField={(key, value) => handleAddField("skill", key, value)}
            onDeleteField={key => handleDeleteField("skill", key)}
            onRenameField={(oldKey, newKey) => handleRenameField("skill", oldKey, newKey)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <RoleCreationLayout
      title={title}
      description={description}
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      canProceedCurrent={canProceedCurrent}
      isSaving={isSaving}
      onComplete={handleComplete}
      renderContent={renderStepContent}
      onBack={onBack}
    />
  );
}
