import type { GameRule } from "../types";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useState } from "react";
import { deepOverrideTargetWithSource, flattenConstraints, wrapIntoNested } from "./ObjectExpansion";

interface GenerateByAIProps {
  ruleId: number;
  localRuleData: GameRule | null;
  onLocalRuleDataChange: (data: GameRule) => void;
  type: number;
}

export default function GenerateByAI({ ruleId, localRuleData, onLocalRuleDataChange, type }: GenerateByAIProps) {
  // 提交描述
  const [description, setDescription] = useState("");

  // 接入接口
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();

  // 提交接口
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();

  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleGenerate = () => {
    setIsTransitioning(true);
    const id = localRuleData?.id || 0;

    const handleSuccess = (data: any, isBasic: number) => {
      setDescription("");

      // 用来合并
      const mergedNumerical: Record<string, any> = {};
      for (const key in localRuleData?.numerical) {
        const ignoreKeys = ["0"];
        if (ignoreKeys.includes(key)) {
          mergedNumerical[key] = localRuleData?.numerical[key];
          continue;
        }

        const base = localRuleData?.numerical[key];
        const wrappedOverride = wrapIntoNested([key], data.data);
        mergedNumerical[key] = deepOverrideTargetWithSource(base, wrappedOverride[key]);
      };

      // 用于上传
      const newRuleData = {
        id,
        name: localRuleData?.name ?? "",
        description: localRuleData?.description ?? "",
        performance: isBasic === 1
          ? Object.entries(data.data || {}).reduce((acc, [key, value]) => {
              acc[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
              return acc;
            }, {} as Record<string, string>)
          : localRuleData?.performance ?? {},
        numerical: isBasic === 2 ? mergedNumerical ?? localRuleData?.numerical ?? {} : localRuleData?.numerical ?? data.data ?? {},
      };
      onLocalRuleDataChange(newRuleData);
      updateFiledAbility({ abilityId: id, act: newRuleData?.performance, ability: flattenConstraints(newRuleData?.numerical) ?? {} });
    };

    if (type === 0) {
      generateBasicInfoByRule(
        { ruleId, prompt: description },
        {
          onSuccess: (data) => {
            handleSuccess(data, 1);
            setIsTransitioning(false);
          },
          onError: () => {
            setIsTransitioning(false);
            console.error("生成失败");
          },
        },
      );
      generateAbilityByRule(
        { ruleId, prompt: description },
        {
          onSuccess: (data) => {
            handleSuccess(data, 2);
            setIsTransitioning(false);
          },
          onError: () => {
            setIsTransitioning(false);
            console.error("生成失败");
          },
        },
      );
    }
    else if (type === 1) {
      generateBasicInfoByRule(
        { ruleId, prompt: description },
        {
          onSuccess: (data) => {
            handleSuccess(data, 1);
            setIsTransitioning(false);
          },
          onError: () => {
            setIsTransitioning(false);
            console.error("生成失败");
          },
        },
      );
    }
    else if (type === 2) {
      generateAbilityByRule(
        { ruleId, prompt: description },
        {
          onSuccess: (data) => {
            handleSuccess(data, 2);
            setIsTransitioning(false);
          },
          onError: () => {
            setIsTransitioning(false);
            console.error("生成失败");
          },
        },
      );
    }
  };

  return (
    <div className="flex justify-center">
      <div className="relative w-full">
        <textarea
          name="车所有"
          className="bg-base-200 rounded-lg p-4 w-full h-40 overflow-auto resize-none"
          placeholder={`不会车卡,让AI来帮你,输入描述,一键生成${type === 0 ? "角色描述和能力" : type === 1 ? "角色描述" : "能力"}`}
          value={description}
          onChange={e => setDescription(e.target.value)}
        >
        </textarea>
        <button
          type="button"
          onClick={handleGenerate}
          className={`btn btn-accent absolute bottom-4 right-2 ${isTransitioning ? "scale-95" : ""}`}
          disabled={isTransitioning || description === ""}
        >
          {isTransitioning
            ? (<span className="loading loading-spinner loading-xs"></span>)
            : (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  AI车卡
                </span>
              )}
        </button>
      </div>
    </div>
  );
}
