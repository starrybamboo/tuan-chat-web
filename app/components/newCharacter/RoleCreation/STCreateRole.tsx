import type { Role } from "../types";
import type { CharacterData } from "./types";
import { useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useCreateRoleMutation, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import RulesSection from "../rules/RulesSection";
import Section from "../Section";
import AttributeEditor from "./components/AttributeEditor";
import CreatePageHeader from "./components/CreatePageHeader";
import NavigationButtons from "./components/NavigationButtons";
import StepIndicator from "./components/StepIndicator";
import BasicInfoStep from "./steps/BasicInfoStep";
import STImportStep from "./steps/STImportStep";

interface STCreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
  setRoles?: React.Dispatch<React.SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

// ST指令导入步骤定义
const ST_STEPS = [
  { id: 1, title: "基础信息" },
  { id: 2, title: "选择规则" },
  { id: 3, title: "ST导入" },
  { id: 4, title: "角色表演" },
  { id: 5, title: "能力配置" },
  { id: 6, title: "技能设定" },
];

/**
 * ST指令创建角色组件
 * 通过ST指令导入，快速完成角色创建
 */
export default function STCreateRole({
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
}: STCreateRoleProps) {
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

  // ST导入相关状态
  const [hasImported, setHasImported] = useState(false); // 追踪是否已导入
  const [isSaving, setIsSaving] = useState(false);

  // 跟踪当前已加载的规则ID，用于检测规则变更
  const [loadedRuleId, setLoadedRuleId] = useState<number>(0);

  // API hooks
  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
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

  // ST导入成功回调
  const handleImportSuccess = (importedData: Partial<CharacterData>) => {
    setCharacterData(prev => ({
      ...prev,
      ...importedData,
    }));
    setHasImported(true);
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
        ? hasImported
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
          <STImportStep
            ruleId={characterData.ruleId}
            characterData={characterData}
            onImportSuccess={handleImportSuccess}
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
        title="ST指令创建角色"
        description="通过ST指令快速导入角色属性"
        onBack={onBack}
      />

      <StepIndicator steps={ST_STEPS} currentStep={currentStep} />

      <div className="mb-8">{renderStepContent()}</div>

      <NavigationButtons
        currentStep={currentStep}
        totalSteps={ST_STEPS.length}
        canProceed={canProceedCurrent && !isSaving}
        onPrevious={() => setCurrentStep(Math.max(1, currentStep - 1))}
        onNext={() => {
          if (!canProceedCurrent || isSaving)
            return;
          setCurrentStep(Math.min(ST_STEPS.length, currentStep + 1));
        }}
        onComplete={handleComplete}
      />
    </div>
  );
}
