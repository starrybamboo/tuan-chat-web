import type { GameRule } from "../types";
// import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "../../../../api/hooks/abilityQueryHooks";
import { useRuleDetailQuery, useRulePageMutation } from "../../../../api/hooks/ruleQueryHooks";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import { flattenConstraints } from "./ObjectExpansion";
import PerformanceEditor from "./PerformanceEditor";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  isEditing?: boolean;
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void;
  roleId: number;
}

// 用于拆解二级对象,方便下面覆盖
function wrapIntoNested(keyPath: string[], valueObject: Record<string, any>): Record<string, any> {
  const result: any = {};
  let current = result;

  for (let i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    current[key] = {};
    current = current[key];
  }

  const lastKey = keyPath[keyPath.length - 1];
  current[lastKey] = valueObject;

  return result;
}

// 实施覆盖，一级对象覆盖二级对象
function deepOverrideTargetWithSource(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in target) {
    if (
      typeof source?.[key] === "object"
      && source?.[key] !== null
      && !Array.isArray(source?.[key])
      && typeof target?.[key] === "object"
      && target?.[key] !== null
      && !Array.isArray(target?.[key])
    ) {
      // 嵌套对象，递归处理
      result[key] = deepOverrideTargetWithSource(target[key], source?.[key]);
    }
    else {
      // 只有 source 存在这个字段时才更新
      if (source && Object.prototype.hasOwnProperty.call(source, key)) {
        result[key] = source[key];
      }
      else {
        // 否则保留 target 原值
        result[key] = target[key];
      }
    }
  }

  return result;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束，完全独立于角色
 */
export default function ExpansionModule({
  onRuleDataChange,
  roleId,
}: ExpansionModuleProps) {
  const [rules, setRules] = useState<GameRule[]>([]); // 规则列表
  const [selectedRuleId, setSelectedRuleId] = useState<number>(
    rules.length > 0 ? rules[0].id : 0,
  ); // 当前选中规则ID
  const [localRuleData, setLocalRuleData] = useState<GameRule | null>(null); // 本地规则数据副本

  const ruleListMutation = useRulePageMutation();
  const abilityListQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 合并规则数据，优先使用能力列表数据
  const currentRuleData = useMemo(() => {
    if (abilityListQuery.data?.id) {
      return abilityListQuery.data;
    }
    else if (ruleDetailQuery.data) {
      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data?.id || 0,
        roleId,
        act: ruleDetailQuery.data?.performance || {},
        ability: flattenConstraints(ruleDetailQuery.data?.numerical || {}) || {},
      });
    }
    return ruleDetailQuery.data;
    // setRoleAbility({
    //   ruleDetailQuery.data?.id,
    //   roleId,
    //   ruleDetailQuery.data?.performance || {},
    //   ruleDetailQuery.data?.numerical || {},
    // });
  }, [abilityListQuery.data, ruleDetailQuery.data]);

  // 初始化规则列表
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await ruleListMutation.mutateAsync({ pageNo: 1, pageSize: 5 });
        if (result && result.length > 0) {
          setRules(result);
          const firstRuleId = result[0].id;
          setSelectedRuleId(firstRuleId);
        }
      }
      catch (error) {
        console.error("获取规则列表失败:", error);
      }
    };

    fetchRules();
  }, []);

  // 初始化或更新本地规则数据
  useEffect(() => {
    if (currentRuleData) {
      const ruleDetailNumerical = ruleDetailQuery.data?.numerical ?? {};
      const abilityNumerical = abilityListQuery.data?.numerical ?? {};

      // 动态遍历 ruleDetail.numerical 的一级键名
      const mergedNumerical = {} as Record<string, any>;

      for (const key in ruleDetailNumerical) {
        const base = ruleDetailNumerical[key];

        // 只处理对象类型字段
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
      const safeRuleData: GameRule = {
        id: currentRuleData.id,
        name: "",
        description: "",
        performance: currentRuleData.performance || {},
        numerical: mergedNumerical,
      };

      setLocalRuleData(safeRuleData);
    }
  }, [currentRuleData]);

  // 处理规则切换
  const handleRuleChange = (newRuleId: number) => {
    // 通知上层规则数据变更
    if (onRuleDataChange && localRuleData) {
      onRuleDataChange(
        newRuleId,
        localRuleData.performance,
        localRuleData.numerical,
      );
    }

    setSelectedRuleId(newRuleId);
  };

  // 更新表演字段
  const handlePerformanceChange = (performance: any) => {
    if (!localRuleData)
      return;

    const newRuleData = {
      ...localRuleData,
      performance,
    };

    setLocalRuleData(newRuleData);

    if (onRuleDataChange && selectedRuleId) {
      onRuleDataChange(selectedRuleId, performance, newRuleData.numerical);
    }
  };

  // 更新数值约束
  const handleNumericalChange = (numerical: any) => {
    if (!localRuleData)
      return;

    const newRuleData = {
      ...localRuleData,
      numerical,
    };

    setLocalRuleData(newRuleData);

    if (onRuleDataChange && selectedRuleId) {
      onRuleDataChange(selectedRuleId, newRuleData.performance, numerical);
    }
  };

  return (
    <div className="space-y-6">
      <RulesSection
        rules={rules}
        currentRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />

      {localRuleData && (
        <>
          <Section title="表演字段配置">
            <PerformanceEditor
              fields={localRuleData.performance}
              onChange={handlePerformanceChange}
              abilityData={localRuleData.performance}
              abilityId={abilityListQuery.data?.id ? localRuleData.id : 0}
            />
          </Section>

          <Section title="数值约束配置">
            <NumericalEditor
              constraints={{ ...localRuleData.numerical }}
              onChange={handleNumericalChange}
              abilityId={abilityListQuery.data?.id ? localRuleData.id : 0}
            />
          </Section>
        </>
      )}
    </div>
  );
}
