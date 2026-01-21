import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";
import type { AIGeneratedData } from "./steps/AIGenerateModal";
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
} from "api/hooks/RoleAndAvatarHooks";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { initAliasMapOnce } from "@/components/common/dicer/aliasRegistry";
import RulesSection from "../rules/RulesSection";
import { UNIFIED_STEPS } from "./constants";
import RoleCreationLayout from "./RoleCreationLayout";
import AIGenerateModal from "./steps/AIGenerateModal";
import AttributeStep from "./steps/AttributeStep";
import BasicInfoStep from "./steps/BasicInfoStep";
import STImportModal from "./steps/STImportModal";
import { completeRoleCreation, evaluateCharacterDataExpressions } from "./utils/roleCreationHelpers";
import { useCharacterData } from "./utils/useCharacterData";

interface RoleCreationFlowProps {
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
  setRoles?: Dispatch<SetStateAction<Role[]>>;
  setSelectedRoleId?: SetSelectedRoleIdFn;
  onSave?: (updatedRole: Role) => void;
  title?: string;
  description?: string;
  roleCreateDefaults?: {
    type?: number;
    spaceId?: number;
  };
  initialCharacterData?: CharacterData;
  hideRuleSelection?: boolean;
}

export default function RoleCreationFlow({
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
  title,
  description,
  roleCreateDefaults,
  initialCharacterData,
  hideRuleSelection,
}: RoleCreationFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // 弹窗状态
  const [isSTModalOpen, setIsSTModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Calculate effective steps based on hideRuleSelection
  const effectiveSteps = useMemo(() => {
    let steps = UNIFIED_STEPS;
    if (hideRuleSelection) {
      steps = steps.filter(step => step.id !== 2);
    }
    // Remap IDs for UI consistency (StepIndicator relies on index logic essentially) and keep original ID
    return steps.map((s, i) => ({
      ...s,
      originalId: s.id,
      id: i + 1, // Remap ID to 1-based index
    }));
  }, [hideRuleSelection]);

  const {
    characterData,
    setCharacterData,
    selectedRuleId,
    handleCharacterDataChange,
    handleAttributeChange,
    handleAddField,
    handleDeleteField,
    handleRenameField,
    handleRuleChange,
  } = useCharacterData({ initialData: initialCharacterData });

  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => {}));
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();

  const hasBasicInfo = characterData.name.trim().length > 0 && characterData.description.trim().length > 0;
  const hasRule = characterData.ruleId > 0;

  const currentOriginalStepId = effectiveSteps[currentStep - 1]?.originalId || 1;

  let canProceedCurrent = true;
  if (currentOriginalStepId === 1)
    canProceedCurrent = hasBasicInfo;
  else if (currentOriginalStepId === 2)
    canProceedCurrent = hasRule;

  // ST导入成功回调
  const handleSTImportSuccess = (importedData: Partial<CharacterData>) => {
    setCharacterData(prev => ({
      ...prev,
      ...importedData,
    }));
  };

  // AI生成数据应用回调
  const handleAIApply = (data: AIGeneratedData) => {
    setCharacterData(prev => ({
      ...prev,
      act: { ...prev.act, ...(data.act || {}) },
      basic: { ...prev.basic, ...(data.basic || {}) },
      ability: { ...prev.ability, ...(data.ability || {}) },
      skill: { ...prev.skill, ...(data.skill || {}) },
    }));
  };

  const handleComplete = async () => {
    if (isSaving)
      return;
    if (!characterData.name.trim() || !characterData.description.trim() || characterData.ruleId <= 0)
      return;

    // 初始化属性别名映射（封装在 aliasRegistry），确保表达式计算前已完成一次性初始化
    initAliasMapOnce();

    setIsSaving(true);
    try {
      await completeRoleCreation(
        {
          characterData,
          createRole,
          roleCreateDefaults,
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

  // 工具按钮点击处理 - 没有规则时显示提示
  const handleSTImportClick = () => {
    if (!hasRule) {
      toast.error("请先选择规则", { position: "top-center" });
      return;
    }
    setIsSTModalOpen(true);
  };

  const handleAIGenerateClick = () => {
    if (!hasRule) {
      toast.error("请先选择规则", { position: "top-center" });
      return;
    }
    setIsAIModalOpen(true);
  };

  // 工具按钮配置 - 始终显示
  const toolButtons = [
    {
      id: "st-import",
      label: "ST导入",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onClick: handleSTImportClick,
    },
    {
      id: "ai-generate",
      label: "AI生成",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      onClick: handleAIGenerateClick,
      variant: "primary" as const,
    },
  ];

  const renderStepContent = () => {
    const originalStepId = effectiveSteps[currentStep - 1]?.originalId || 1;

    switch (originalStepId) {
      case 1:
        return (
          <BasicInfoStep characterData={characterData} onCharacterDataChange={handleCharacterDataChange} />
        );
      case 2:
        return (
          <RulesSection large currentRuleId={characterData.ruleId} onRuleChange={handleRuleChange} />
        );
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
    <>
      <RoleCreationLayout
        title={title ?? "创建角色"}
        description={description ?? "填写角色信息，完成角色创建"}
        steps={effectiveSteps}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        canProceedCurrent={canProceedCurrent}
        isSaving={isSaving}
        onComplete={handleComplete}
        renderContent={renderStepContent}
        onBack={onBack}
        toolButtons={toolButtons}
      />

      {/* ST导入弹窗 */}
      <STImportModal
        isOpen={isSTModalOpen}
        onClose={() => setIsSTModalOpen(false)}
        characterData={characterData}
        onImportSuccess={handleSTImportSuccess}
      />

      {/* AI生成弹窗 */}
      <AIGenerateModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        ruleId={selectedRuleId}
        onApply={handleAIApply}
        generateBasicInfoByRule={generateBasicInfoByRule}
        generateAbilityByRule={generateAbilityByRule}
      />
    </>
  );
}
