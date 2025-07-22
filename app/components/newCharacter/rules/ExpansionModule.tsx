import type { GameRule } from "../types";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import Section from "../Section";
import GenerateByAI from "./GenerateByAI";
import ImportWithStCmd from "./ImportWithStCmd";
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
  useEffect(() => {
    if (ruleDetailQuery.data && !abilityQuery.data && !abilityQuery.isLoading) {
      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data?.id || 0,
        roleId,
        act: ruleDetailQuery.data?.performance || {},
        ability: flattenConstraints(ruleDetailQuery.data?.numerical || {}),
      });
    }
  }, [ruleDetailQuery.data, abilityQuery.data, abilityQuery.isLoading, roleId]);

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
    <div className="space-y-6 p-4 mt-4">
      {/* 规则选择区域 */}
      <Section title="规则选择">
        <RulesSection
          currentRuleId={selectedRuleId}
          onRuleChange={handleRuleChange}
        />
      </Section>
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
              <PerformanceEditor
                fields={{
                  ...(localRuleData.performance ?? ruleDetailQuery.data?.performance ?? {}),
                }}
                onChange={handlePerformanceChange}
                abilityData={localRuleData.performance}
                abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
              />
              <GenerateByAI
                ruleId={selectedRuleId}
                localRuleData={localRuleData}
                onLocalRuleDataChange={setLocalRuleData}
                type={1}
              />
            </Section>

            <Section title="数值约束配置" className="mb-12">
              <NumericalEditor
                constraints={{
                  ...(localRuleData.numerical ?? ruleDetailQuery.data?.numerical ?? {}),
                }}
                onChange={handleNumericalChange}
                abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
              />
              <ImportWithStCmd
                ruleId={selectedRuleId}
                roleId={roleId}
                onImportSuccess={() => {}}
              />
              <GenerateByAI
                ruleId={selectedRuleId}
                localRuleData={localRuleData}
                onLocalRuleDataChange={setLocalRuleData}
                type={2}
              />
            </Section>
            {/* <GenerateByAI
              ruleId={selectedRuleId}
              localRuleData={localRuleData}
              onLocalRuleDataChange={setLocalRuleData}
              type={0}
            /> */}
          </>
        )}
    </div>
  );
}
