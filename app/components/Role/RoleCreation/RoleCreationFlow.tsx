import type { Dispatch, SetStateAction } from "react";
import type { Role } from "../types";
import type { CharacterData } from "./types";
import type { SetSelectedRoleIdFn } from "./utils/roleCreationHelpers";

import { useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveSteps = useMemo(() => {
    let steps = UNIFIED_STEPS;
    if (hideRuleSelection) {
      steps = steps.filter(step => step.id !== 2);
    }
    return steps.map((step, index) => ({
      ...step,
      originalId: step.id,
      id: index + 1,
    }));
  }, [hideRuleSelection]);

  const {
    characterData,
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

  const hasBasicInfo = characterData.name.trim().length > 0 && characterData.description.trim().length > 0;
  const hasRule = characterData.ruleId > 0;
  const currentOriginalStepId = effectiveSteps[currentStep - 1]?.originalId || 1;

  let canProceedCurrent = true;
  if (currentOriginalStepId === 1)
    canProceedCurrent = hasBasicInfo;
  else if (currentOriginalStepId === 2)
    canProceedCurrent = hasRule;

  const handleComplete = async () => {
    if (isSaving)
      return;
    if (!hasBasicInfo) {
      return;
    }
    if (!hideRuleSelection && !hasRule) {
      toast.error("请先选择规则", { position: "top-center" });
      return;
    }

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

  const renderStepContent = () => {
    const originalStepId = effectiveSteps[currentStep - 1]?.originalId || 1;

    switch (originalStepId) {
      case 1:
        return (
          <BasicInfoStep
            characterData={characterData}
            onCharacterDataChange={handleCharacterDataChange}
          />
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
  );
}
