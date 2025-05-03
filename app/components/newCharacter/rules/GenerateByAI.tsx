import type { GameRule } from "../types";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation } from "api/hooks/abilityQueryHooks";
import { useState } from "react";

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

  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleGenerate = () => {
    setIsTransitioning(true);
    const id = localRuleData?.id || 0;

    const handleSuccess = (data: any, isBasic: boolean) => {
      setDescription("");
      const newRuleData = {
        id,
        name: localRuleData?.name ?? "",
        description: localRuleData?.description ?? "",
        performance: isBasic
          ? Object.entries(data.data || {}).reduce((acc, [key, value]) => {
              acc[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
              return acc;
            }, {} as Record<string, string>)
          : localRuleData?.performance ?? {},
        numerical: isBasic ? data.data ?? localRuleData?.numerical ?? {} : data.data ?? localRuleData?.numerical ?? {},
      };
      onLocalRuleDataChange(newRuleData);
    };

    if (type === 0) {
      generateBasicInfoByRule(
        { ruleId, prompt: description },
        {
          onSuccess: (data) => {
            handleSuccess(data, true);
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
            handleSuccess(data, true);
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
            handleSuccess(data, true);
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
            handleSuccess(data, true);
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
    <div className="flex justify-between">
      <textarea
        name="车所有"
        className="bg-base-200 rounded-lg p-4 w-8/10 overflow-auto resize-none"
        placeholder={`不会车卡,让AI来帮你,输入描述,一键生成${type === 0 ? "角色描述和能力" : type === 1 ? "角色描述" : "能力"}`}
        value={description}
        onChange={e => setDescription(e.target.value)}
      >
      </textarea>
      <button
        type="button"
        onClick={handleGenerate}
        className={`btn btn-accent w-1/10 mt-3 mr-15 ${isTransitioning ? "scale-95" : ""}`}
        disabled={isTransitioning}
      >
        {isTransitioning
          ? (<span className="loading loading-spinner loading-xs"></span>)
          : (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                  <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                </svg>
                车卡
              </span>
            )}
      </button>
    </div>
  );
}
