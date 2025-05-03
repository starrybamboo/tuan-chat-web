import type { GameRule } from "../types";
import { useAbilityByRuleAndRole, useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import { deepOverrideTargetWithSource, flattenConstraints, wrapIntoNested } from "./ObjectExpansion";
import PerformanceEditor from "./PerformanceEditor";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  isEditing?: boolean;
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void;
  roleId: number;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束
 */
export default function ExpansionModule({
  onRuleDataChange,
  roleId,
}: ExpansionModuleProps) {
  // 状态
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  const [localRuleData, setLocalRuleData] = useState<GameRule | null>(null);

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 规则详情合并逻辑
  const currentRuleData = useMemo(() => {
    if (abilityQuery.data?.id) {
      return abilityQuery.data;
    }
    return ruleDetailQuery.data;
  }, [abilityQuery.data, ruleDetailQuery.data]);

  // 初始化能力数据
  if (ruleDetailQuery.data && !abilityQuery.data && !abilityQuery.isLoading && !abilityQuery.isFetched) {
    setRoleAbilityMutation.mutate({
      ruleId: ruleDetailQuery.data?.id || 0,
      roleId,
      act: ruleDetailQuery.data?.performance || {},
      ability: flattenConstraints(ruleDetailQuery.data?.numerical || {}) || {},
    });
  }

  // 构建本地规则副本（合并数值）
  useEffect(() => {
    if (currentRuleData && ruleDetailQuery.data) {
      const detailNumerical = ruleDetailQuery.data?.numerical ?? {};
      const abilityNumerical = abilityQuery.data?.numerical ?? {};
      const mergedNumerical: Record<string, any> = {};

      for (const key in detailNumerical) {
        const base = detailNumerical[key];
        if (typeof base === "object" && base !== null && !Array.isArray(base)) {
          // 把 ability.numerical 包装成嵌套结构：{ [key]: abilityNumerical }
          const wrappedOverride = wrapIntoNested([key], abilityNumerical);

          // 深度覆盖合并
          mergedNumerical[key] = deepOverrideTargetWithSource(
            base,
            wrappedOverride[key],
          );
        }
      }

      // 显式处理缺失字段，保证类型一致性
      const safeData: GameRule = {
        id: currentRuleData.id,
        name: "",
        description: "",
        performance: currentRuleData.performance || {},
        numerical: mergedNumerical,
      };
      setLocalRuleData(safeData);
    }
  }, [currentRuleData, abilityQuery.data?.numerical, ruleDetailQuery.data, abilityQuery.isLoading, ruleDetailQuery.isLoading]);

  // 添加loading状态控制
  const [isLoading, setIsLoading] = useState(false);

  // ruleId 选择变化
  const handleRuleChange = (newRuleId: number) => {
    // 设置loading状态
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 300);
    setSelectedRuleId(newRuleId);
  };

  // 更新表演字段
  const handlePerformanceChange = (performance: any) => {
    if (!localRuleData)
      return;
    const updated = { ...localRuleData, performance };
    setLocalRuleData(updated);
    onRuleDataChange?.(selectedRuleId, performance, updated.numerical);
  };

  // 更新数值约束
  const handleNumericalChange = (numerical: any) => {
    if (!localRuleData)
      return;
    const updated = { ...localRuleData, numerical };
    setLocalRuleData(updated);
    onRuleDataChange?.(selectedRuleId, updated.performance, numerical);
  };

  return (
    <div className="space-y-6">
      {/* 规则选择区域 */}
      <RulesSection
        currentRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />
      <GenerateByAI
        ruleId={selectedRuleId}
        localRuleData={localRuleData}
        onLocalRuleDataChange={setLocalRuleData}
        type={0}
      />
      {/* 规则详情区域 */}
      {isLoading
        ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )
        : localRuleData && (
          <>
            <Section title="表演字段配置">
              <GenerateByAI
                ruleId={selectedRuleId}
                localRuleData={localRuleData}
                onLocalRuleDataChange={setLocalRuleData}
                type={1}
              />
              <PerformanceEditor
                fields={{
                  ...(localRuleData.performance ?? ruleDetailQuery.data?.performance ?? {}),
                }}
                onChange={handlePerformanceChange}
                abilityData={localRuleData.performance}
                abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
              />
            </Section>

            <Section title="数值约束配置" className="mb-12">
              <GenerateByAI
                ruleId={selectedRuleId}
                localRuleData={localRuleData}
                onLocalRuleDataChange={setLocalRuleData}
                type={2}
              />
              <NumericalEditor
                constraints={{
                  ...(localRuleData.numerical ?? ruleDetailQuery.data?.numerical ?? {}),
                }}
                onChange={handleNumericalChange}
                abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
              />
            </Section>
          </>
        )}
    </div>
  );
}

interface GenerateByAIProps {
  ruleId: number;
  localRuleData: GameRule | null;
  onLocalRuleDataChange: (data: GameRule) => void;
  type: number;
}

function GenerateByAI({ ruleId, localRuleData, onLocalRuleDataChange, type }: GenerateByAIProps) {
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
