import type { Rule } from "api/models/Rule";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useState } from "react";

interface GenerateByAIProps {
  ruleId: number;
  localRuleData: Rule | null;
  onLocalRuleDataChange: (data: Rule) => void;
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
    const id = localRuleData?.ruleId || 0;

    const handleSuccess = (data: any, isBasic: number) => {
      setDescription("");

      // 直接使用数据，数据本身就是字符串格式
      const mergedBasicDefault = {
        ...localRuleData?.basicDefault,
        ...(isBasic === 2 ? data.data || {} : {}),
      };

      // 用于上传
      const newRuleData: Rule = {
        ruleId: id,
        ruleName: localRuleData?.ruleName ?? "",
        ruleDescription: localRuleData?.ruleDescription ?? "",
        actTemplate: isBasic === 1
          ? data.data || {}
          : localRuleData?.actTemplate ?? {},
        basicDefault: isBasic === 2
          ? mergedBasicDefault
          : (localRuleData?.basicDefault ?? data.data ?? {}),
      };
      onLocalRuleDataChange(newRuleData);

      updateFiledAbility({
        abilityId: id,
        act: newRuleData?.actTemplate || {},
        basic: newRuleData?.basicDefault || {},
      });
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
    <fieldset className="border border-base-300 rounded-lg p-4">
      <legend className="px-2 font-bold">AI 生成</legend>
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
    </fieldset>
  );
}
