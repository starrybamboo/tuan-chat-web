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
import { useState } from "react";
import toast from "react-hot-toast";
import { initAliasMapOnce } from "@/components/common/dicer/aliasRegistry";
import RulesSection from "../rules/RulesSection";
import CreatePageHeader from "./CreatePageHeader";
import AIGenerateModal from "./steps/AIGenerateModal";
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
  const [isSaving, setIsSaving] = useState(false);

  // 弹窗状态
  const [isSTModalOpen, setIsSTModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const {
    characterData,
    setCharacterData,
    selectedRuleId,
    handleCharacterDataChange,
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
  const canComplete = hasBasicInfo && (hideRuleSelection ? true : hasRule) && !isSaving;

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
      disabled: !hasRule,
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
      disabled: !hasRule,
    },
  ];

  return (
    <>
      <div className={`max-w-4xl mx-auto p-6 transition-opacity duration-300 ease-in-out ${isSaving ? "opacity-60" : ""}`}>
        <CreatePageHeader
          title={title ?? "创建角色"}
          description={description ?? "填写基础信息与规则，后续能力字段默认继承规则模板"}
          onBack={onBack}
          toolButtons={toolButtons}
        />

        <div className="divider md:hidden" />

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

          <div className="flex justify-end">
            <button
              type="button"
              className={`btn btn-success rounded-md bg-gradient-to-r from-green-500 to-emerald-500 border-none disabled:opacity-60 disabled:cursor-not-allowed ${isSaving ? "scale-95" : ""}`}
              onClick={handleComplete}
              disabled={!canComplete}
            >
              {isSaving
                ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  )
                : (
                    <span className="flex items-center gap-1">完成创建</span>
                  )}
            </button>
          </div>
        </div>
      </div>

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
