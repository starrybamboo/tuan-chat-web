import type { GameRule } from "../types";
import { useEffect, useMemo, useState } from "react";
import { useAbilityByRuleAndRole, useRuleDetailQuery, useRulePageMutation } from "../../../../api/queryHooks";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  isEditing?: boolean;
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void;
  roleId: number;
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

  // 合并规则数据，优先使用能力列表数据
  const currentRuleData = useMemo(() => {
    if (abilityListQuery.data?.id) {
      return abilityListQuery.data;
    }
    return ruleDetailQuery.data;
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
      // 显式处理缺失字段，保证类型一致性
      const safeRuleData: GameRule = {
        id: currentRuleData.id,
        name: "", // 或者从 currentRuleData.name 拷贝
        description: "",
        performance: currentRuleData.performance || {},
        numerical: currentRuleData.numerical || {},
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
              constraints={localRuleData.numerical}
              onChange={handleNumericalChange}
            />
          </Section>
        </>
      )}
    </div>
  );
}
