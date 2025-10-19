import type { Role } from "../types";
import type { CharacterData } from "./types";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useCreateRoleMutation, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import RulesSection from "../rules/RulesSection";
import Section from "../Section";
import AIGenerationCard from "./components/AIGenerationCard";
import AttributeEditor from "./components/AttributeEditor";
import CreatePageHeader from "./components/CreatePageHeader";
import NavigationButtons from "./components/NavigationButtons";
import StepIndicator from "./components/StepIndicator";
import { AI_STEPS } from "./constants";
import BasicInfoStep from "./steps/BasicInfoStep";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
  setRoles?: React.Dispatch<React.SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

/**
 * AI智能创建角色组件
 * 通过AI辅助，分步完成角色创建
 */
export default function AICreateRole({
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
}: AICreateRoleProps) {
  // 步骤控制
  const [currentStep, setCurrentStep] = useState(1);

  // 角色数据状态
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "",
    description: "",
    avatar: "",
    ruleId: 0,
    act: {},
    basic: {},
    ability: {},
    skill: {},
  });

  // AI相关状态
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false); // 追踪是否已生成
  const [isSaving, setIsSaving] = useState(false);

  // 跟踪当前已加载的规则ID，用于检测规则变更
  const [loadedRuleId, setLoadedRuleId] = useState<number>(0);

  // API hooks
  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => { }));

  // 获取规则详情
  const selectedRuleId = characterData.ruleId || 0;
  const isValidRuleId = !Number.isNaN(selectedRuleId) && selectedRuleId > 0;
  const { data: ruleDetailData } = useRuleDetailQuery(selectedRuleId, {
    enabled: isValidRuleId,
  });

  // 当规则数据加载完成时，自动填充默认属性
  useEffect(() => {
    if (isValidRuleId && ruleDetailData && characterData.ruleId
      && (loadedRuleId === 0 || loadedRuleId !== selectedRuleId)) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setCharacterData(prev => ({
        ...prev,
        act: ruleDetailData.actTemplate || {},
        basic: ruleDetailData.basicDefault || {},
        ability: ruleDetailData.abilityFormula || {},
        skill: ruleDetailData.skillDefault || {},
      }));
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setLoadedRuleId(selectedRuleId);
    }
  }, [isValidRuleId, ruleDetailData, characterData.ruleId, loadedRuleId, selectedRuleId]);

  // 处理基础信息变更
  const handleCharacterDataChange = (data: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...data }));
  };

  // 处理规则系统变更
  const handleRuleChange = useCallback((currentRuleId: number) => {
    setCharacterData(prev => ({ ...prev, ruleId: currentRuleId }));
    setLoadedRuleId(0);
  }, []);

  // 处理属性变更
  const handleAttributeChange = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleAddField = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const handleDeleteField = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
  ) => {
    setCharacterData((prev) => {
      const next = { ...prev[section] } as Record<string, string>;
      delete next[key];
      return { ...prev, [section]: next };
    });
  };

  const handleRenameField = (
    section: "act" | "basic" | "ability" | "skill",
    oldKey: string,
    newKey: string,
  ) => {
    if (!newKey.trim() || oldKey === newKey)
      return;
    setCharacterData((prev) => {
      if (newKey in prev[section])
        return prev;
      const sectionData = { ...prev[section] } as Record<string, string>;
      const value = sectionData[oldKey];
      delete sectionData[oldKey];
      sectionData[newKey] = value;
      return { ...prev, [section]: sectionData };
    });
  };

  // AI生成处理
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !isValidRuleId)
      return;

    setIsGenerating(true);

    try {
      const ruleId = selectedRuleId;

      // 生成角色表演能力 (act)
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

      // 生成基础信息、能力数据和技能 (basic + ability + skill)
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

  // 完成创建
  const handleComplete = async () => {
    if (isSaving)
      return;
    if (!characterData.name.trim() || !characterData.description.trim() || characterData.ruleId <= 0)
      return;

    setIsSaving(true);
    try {
      const roleId = await createRole({
        roleName: characterData.name.trim(),
        description: characterData.description.trim(),
      });
      if (!roleId)
        throw new Error("角色创建失败");

      let avatarId: number | undefined;
      let avatarUrl: string | undefined;
      try {
        const avatarRes = await uploadAvatar({
          avatarUrl: "/favicon.ico",
          spriteUrl: "/favicon.ico",
          roleId,
        });
        avatarId = avatarRes?.data?.avatarId;
        avatarUrl = avatarRes?.data?.avatarUrl;
      }
      catch (e) {
        console.warn("默认头像上传失败", e);
      }

      if (characterData.ruleId > 0) {
        setRoleAbility({
          ruleId: characterData.ruleId,
          roleId,
          act: characterData.act,
          basic: characterData.basic,
          ability: characterData.ability,
          skill: characterData.skill,
        });
      }

      const newRole: Role = {
        id: roleId,
        name: characterData.name.trim(),
        description: characterData.description.trim(),
        avatar: avatarUrl || "/favicon.ico",
        avatarId: avatarId || 0,
        modelName: "散华",
        speakerName: "鸣潮",
      };

      if (setRoles) {
        setRoles(prev => [newRole, ...prev]);
      }
      if (setSelectedRoleId) {
        setSelectedRoleId(newRole.id);
      }
      updateRole(newRole);
      onComplete?.(newRole, characterData.ruleId);
    }
    catch (error) {
      console.error("创建角色失败", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  // 步骤进度检查
  const canProceedCurrent = currentStep === 1
    ? (characterData.name.trim().length > 0 && characterData.description.trim().length > 0)
    : currentStep === 2
      ? characterData.ruleId > 0
      : currentStep === 3
        ? hasGenerated
        : true;

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            characterData={characterData}
            onCharacterDataChange={handleCharacterDataChange}
          />
        );

      case 2:
        return (
          <RulesSection
            large
            currentRuleId={characterData.ruleId}
            onRuleChange={handleRuleChange}
          />
        );

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
        return (
          <Section title="角色表演能力" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
            <AttributeEditor
              title="角色表演能力"
              attributes={characterData.act}
              onChange={(key: string, value: string) => handleAttributeChange("act", key, value)}
              onAddField={(k: string, v: string) => handleAddField("act", k, v)}
              onDeleteField={(k: string) => handleDeleteField("act", k)}
              onRenameField={(ok: string, nk: string) => handleRenameField("act", ok, nk)}
            />
          </Section>
        );

      case 5:
        return (
          <>
            <Section title="基础属性配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100 mb-6">
              <AttributeEditor
                title="基础能力值"
                attributes={characterData.basic}
                onChange={(key: string, value: string) => handleAttributeChange("basic", key, value)}
                onAddField={(k: string, v: string) => handleAddField("basic", k, v)}
                onDeleteField={(k: string) => handleDeleteField("basic", k)}
                onRenameField={(ok: string, nk: string) => handleRenameField("basic", ok, nk)}
              />
            </Section>
            <Section title="能力配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
              <AttributeEditor
                title="计算能力值"
                attributes={characterData.ability}
                onChange={(key: string, value: string) => handleAttributeChange("ability", key, value)}
                onAddField={(k: string, v: string) => handleAddField("ability", k, v)}
                onDeleteField={(k: string) => handleDeleteField("ability", k)}
                onRenameField={(ok: string, nk: string) => handleRenameField("ability", ok, nk)}
              />
            </Section>
          </>
        );

      case 6:
        return (
          <Section title="技能设定" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
            <AttributeEditor
              title="技能设定"
              attributes={characterData.skill}
              onChange={(key: string, value: string) => handleAttributeChange("skill", key, value)}
              onAddField={(k: string, v: string) => handleAddField("skill", k, v)}
              onDeleteField={(k: string) => handleDeleteField("skill", k)}
              onRenameField={(ok: string, nk: string) => handleRenameField("skill", ok, nk)}
            />
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CreatePageHeader
        title="AI智能创建角色"
        description="通过AI辅助，分步完成角色创建"
        onBack={onBack}
      />

      <StepIndicator steps={AI_STEPS} currentStep={currentStep} />

      <div className="mb-8">{renderStepContent()}</div>

      <NavigationButtons
        currentStep={currentStep}
        totalSteps={AI_STEPS.length}
        canProceed={canProceedCurrent && !isSaving}
        onPrevious={() => setCurrentStep(Math.max(1, currentStep - 1))}
        onNext={() => {
          if (!canProceedCurrent || isSaving)
            return;
          setCurrentStep(Math.min(AI_STEPS.length, currentStep + 1));
        }}
        onComplete={handleComplete}
      />
    </div>
  );
}
