import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";
import type { CharacterData } from "./types";
import type { SetSelectedRoleIdFn } from "./utils/roleCreationHelpers";

import {
  useSetRoleAbilityMutation,
} from "api/hooks/abilityQueryHooks";
import {
  useCreateRoleMutation,
  useUpdateRoleWithLocalMutation,
  useUploadAvatarMutation,
} from "api/hooks/RoleAndAvatarHooks";
import { useMemo, useState } from "react";
import { initAliasMapOnce } from "@/components/common/dicer/aliasRegistry";
import RulesSection from "../rules/RulesSection";
import { UNIFIED_STEPS } from "./constants";
import RoleCreationLayout from "./RoleCreationLayout";
import AttributeStep from "./steps/AttributeStep";
import BasicInfoStep from "./steps/BasicInfoStep";
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
  const [isSaving, setIsSaving] = useState(false);

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
    handleCharacterDataChange,
    handleRuleChange,
  } = useCharacterData({ initialData: initialCharacterData });

  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => {}));

  const hasBasicInfo = characterData.name.trim().length > 0 && characterData.description.trim().length > 0;
  const hasRule = characterData.ruleId > 0;
  const canComplete = hasBasicInfo && (hideRuleSelection ? true : hasRule) && !isSaving;

  const handleComplete = async () => {
    if (isSaving) {
      return;
    }

    if (!hasBasicInfo) {
      return;
    }

    if (!hideRuleSelection && !hasRule) {
      toast.error("请先选择规则", { position: "top-center" });
      return;
    }

    // 初始化属性别名映射（封装在 aliasRegistry），确保表达式计算前已完成一次性初始化
    initAliasMapOnce();

    setIsSaving(true);
    try {
      const payloadData: CharacterData = (!hideRuleSelection || hasRule)
        ? characterData
        : {
            ...characterData,
            ruleId: 1,
          };

      await completeRoleCreation(
        {
          characterData: payloadData,
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

  const renderStepContent = () => {
    const originalStepId = effectiveSteps[currentStep - 1]?.originalId || 1;

        <div className="space-y-6">
          <BasicInfoStep
            characterData={characterData}
            onCharacterDataChange={handleCharacterDataChange}
          />

          {!hideRuleSelection && (
            <RulesSection
              large
              currentRuleId={characterData.ruleId}
              onRuleChange={handleRuleChange}
            />
          )}

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
      />
    </>
  );
}
