import type { Rule } from "api/models/Rule";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import Section from "../Section";
import ImportWithStCmd from "./ImportWithStCmd";
import NumericalEditor from "./NumericalEditor";
import { deepOverrideTargetWithSource, flattenConstraints, wrapIntoNested } from "./ObjectExpansion";
import PerformanceEditor from "./PerformanceEditor";

interface ExpansionModuleProps {
  isEditing?: boolean;
  onRuleDataChange?: (ruleId: number, actTemplate: any, abilityDefault: any) => void;
  roleId: number;
  /**
   * 可选, 会默认选中对应的ruleId, 且不再展示选择规则的部分组件
   */
  ruleId?: number;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束
 */
export default function ExpansionModule({
  onRuleDataChange,
  roleId,
  ruleId,
}: ExpansionModuleProps) {
  // 状态
  const selectedRuleId = ruleId ?? 1;
  const [localRuleData, setLocalRuleData] = useState<Rule | null>(null);

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 规则详情合并逻辑
  const currentRuleData = useMemo(() => {
    if (abilityQuery.data?.abilityId) {
      return abilityQuery.data;
    }
    return ruleDetailQuery.data;
  }, [abilityQuery.data, ruleDetailQuery.data]);

  // 初始化能力数据
  useEffect(() => {
    if (ruleDetailQuery.data && !abilityQuery.data && !abilityQuery.isLoading) {
      // 确保 ability 字段的值都是数字类型
      const flattenedConstraints = flattenConstraints(ruleDetailQuery.data?.abilityDefault || {});
      const numericAbility: Record<string, number> = {};
      Object.entries(flattenedConstraints).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null && "displayValue" in value) {
          // 处理公式值对象
          numericAbility[key] = Number(value.displayValue) || 0;
        }
        else {
          // 处理普通数值
          numericAbility[key] = Number(value) || 0;
        }
      });

      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data?.ruleId || 0,
        roleId,
        act: ruleDetailQuery.data?.actTemplate || {},
        ability: numericAbility,
      });
    }
  }, [ruleDetailQuery.data, abilityQuery.data, abilityQuery.isLoading, roleId, setRoleAbilityMutation]);

  // 构建本地规则副本（合并数值）
  useEffect(() => {
    if (currentRuleData && ruleDetailQuery.data) {
      const detailAbilityDefault = ruleDetailQuery.data?.abilityDefault ?? {};
      const abilityAbilityDefault = abilityQuery.data?.abilityDefault ?? {};
      const mergedAbilityDefault: Record<string, Record<string, any>> = {};

      for (const key in detailAbilityDefault) {
        const base = detailAbilityDefault[key];
        if (typeof base === "object" && base !== null && !Array.isArray(base)) {
          // 把 ability.abilityDefault 包装成嵌套结构：{ [key]: abilityAbilityDefault }
          const wrappedOverride = wrapIntoNested([key], abilityAbilityDefault);

          // 深度覆盖合并
          mergedAbilityDefault[key] = deepOverrideTargetWithSource(
            base,
            wrappedOverride[key],
          );
        }
      }

      // 显式处理缺失字段，保证类型一致性
      const safeData: Rule = {
        ruleId: ruleDetailQuery.data?.ruleId,
        ruleName: ruleDetailQuery.data?.ruleName || "",
        ruleDescription: ruleDetailQuery.data?.ruleDescription || "",
        actTemplate: (currentRuleData as any).actTemplate || {},
        abilityDefault: mergedAbilityDefault,
      };
      setLocalRuleData(safeData);
    }
  }, [currentRuleData, abilityQuery.data?.abilityDefault, ruleDetailQuery.data, abilityQuery.isLoading, ruleDetailQuery.isLoading]);

  // 更新表演字段
  const handleActTemplateChange = (actTemplate: any) => {
    if (!localRuleData)
      return;
    const updated = { ...localRuleData, actTemplate };
    setLocalRuleData(updated);
    onRuleDataChange?.(selectedRuleId, actTemplate, updated.abilityDefault);
  };

  // 更新数值约束
  const handleAbilityDefaultChange = (abilityDefault: any) => {
    if (!localRuleData)
      return;
    const updated = { ...localRuleData, abilityDefault };
    setLocalRuleData(updated);
    onRuleDataChange?.(selectedRuleId, updated.actTemplate, abilityDefault);
  };

  return (
    <div className="space-y-6">
      {/* 规则详情区域 */}
      {localRuleData && (
        <>
          <Section title="表演字段配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
            <PerformanceEditor
              fields={{
                ...(localRuleData.actTemplate ?? ruleDetailQuery.data?.actTemplate ?? {}),
              }}
              onChange={handleActTemplateChange}
              abilityData={localRuleData.actTemplate ?? {}}
              abilityId={abilityQuery.data?.abilityId || 0}
            />
          </Section>

          <Section title="数值约束配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
            <NumericalEditor
              constraints={{
                ...(localRuleData.abilityDefault ?? ruleDetailQuery.data?.abilityDefault ?? {}),
              }}
              onChange={handleAbilityDefaultChange}
              abilityId={abilityQuery.data?.abilityId || 0}
            />
            <ImportWithStCmd
              ruleId={selectedRuleId}
              roleId={roleId}
              onImportSuccess={() => { }}
            />
          </Section>
        </>
      )}
    </div>
  );
}
