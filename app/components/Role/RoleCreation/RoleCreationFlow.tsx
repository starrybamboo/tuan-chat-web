import type { Role } from "../types";
import type { CharacterData } from "./types";

import { Plus } from "@phosphor-icons/react";
import { lazy, Suspense, useState } from "react";
import toast from "react-hot-toast";
import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_DESCRIPTION_TOO_LONG_MESSAGE } from "./constants";
import CreatePageHeader from "./CreatePageHeader";
import { useCreateRoleWithAbilityMutation } from "./hooks/useCreateRoleWithAbilityMutation";
import BasicInfoStep from "./steps/BasicInfoStep";
import { evaluateCharacterDataExpressions } from "./utils/roleCreationHelpers";
import { useCharacterData } from "./utils/useCharacterData";

const LazyRulesSection = lazy(() => import("../rules/RulesSection"));

interface RoleCreationFlowProps {
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
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
  title,
  description,
  roleCreateDefaults,
  initialCharacterData,
  hideRuleSelection,
}: RoleCreationFlowProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    characterData,
    handleCharacterDataChange,
    handleRuleChange,
  } = useCharacterData({ initialData: initialCharacterData });

  const createRoleWithAbility = useCreateRoleWithAbilityMutation();

  const hasBasicInfo = characterData.name.trim().length > 0 && characterData.description.trim().length > 0;
  const isDescriptionTooLong = characterData.description.trim().length > ROLE_DESCRIPTION_MAX_LENGTH;
  const hasRule = characterData.ruleId > 0;
  const canCreate = hasBasicInfo && !isDescriptionTooLong && (hideRuleSelection || hasRule);

  const handleComplete = async () => {
    if (isSaving)
      return;
    if (!hasBasicInfo) {
      return;
    }
    if (isDescriptionTooLong) {
      toast.error(ROLE_DESCRIPTION_TOO_LONG_MESSAGE, { position: "top-center" });
      return;
    }
    if (!hideRuleSelection && !hasRule) {
      toast.error("请先选择规则", { position: "top-center" });
      return;
    }

    setIsSaving(true);
    try {
      const processedData = characterData.ruleId > 0
        ? evaluateCharacterDataExpressions(characterData)
        : characterData;
      const role = await createRoleWithAbility.mutateAsync({
        roleName: processedData.name.trim(),
        description: processedData.description.trim(),
        type: roleCreateDefaults?.type,
        spaceId: roleCreateDefaults?.spaceId,
        ruleId: processedData.ruleId,
        act: processedData.act,
        basic: processedData.basic,
        ability: processedData.ability,
        skill: processedData.skill,
      });
      onComplete?.(role, processedData.ruleId);
    }
    catch (error) {
      console.error("创建角色失败", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CreatePageHeader
        title={title ?? "创建角色"}
        description={description ?? "填写角色信息，完成角色创建"}
        onBack={onBack}
        toolButtons={[
          {
            id: "create-role",
            label: isSaving ? "创建中..." : "创建角色",
            icon: <Plus className="size-4" weight="bold" />,
            onClick: handleComplete,
            disabled: !canCreate || isSaving,
            variant: "primary",
          },
        ]}
      />

      <div className="md:hidden mb-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
                ← 返回
              </button>
            )}
            <h1 className="font-semibold text-xl">{title ?? "创建角色"}</h1>
          </div>
          <button
            type="button"
            className={`btn btn-sm md:btn-lg rounded-lg btn-primary ${isSaving ? "scale-95" : ""}`}
            onClick={handleComplete}
            disabled={!canCreate || isSaving}
          >
            {isSaving
              ? <span className="loading loading-spinner loading-xs"></span>
              : (
                  <span className="flex items-center gap-1">
                    <Plus className="size-4" weight="bold" />
                    创建角色
                  </span>
                )}
          </button>
        </div>
        <p className="text-sm text-base-content/60">{description ?? "填写角色信息，完成角色创建"}</p>
      </div>

      <div className="space-y-6">
        <BasicInfoStep
          characterData={characterData}
          onCharacterDataChange={handleCharacterDataChange}
        />

        {!hideRuleSelection && (
          <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
            <div className="card-body p-4 md:p-5 space-y-3">
              <Suspense fallback={<div className="skeleton h-24 w-full rounded-lg" />}>
                <LazyRulesSection
                  large={false}
                  currentRuleId={characterData.ruleId}
                  autoSelectFirst={false}
                  title="全部规则模板"
                  description="选择规则用于角色创建"
                  controlsInHeader
                  pageSize={16}
                  gridMode="four"
                  dense
                  onRuleChange={handleRuleChange}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
