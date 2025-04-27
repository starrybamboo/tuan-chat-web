import type { GameRule } from "../types";
import { useState } from "react";
import { useRuleListQuery } from "../../../../api/queryHooks";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";
import { defaultRules } from "./rules";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  rules?: GameRule[];
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void; // 可选回调
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束，完全独立于角色
 */
export default function ExpansionModule({
  rules = defaultRules,
  onRuleDataChange,
}: ExpansionModuleProps) {
  // 管理当前选择的规则和规则数据
  const [selectedRuleId, setSelectedRuleId] = useState<number>(
    rules.length > 0 ? rules[0].id : 0,
  );
  const [currentRule, setCurrentRule] = useState<GameRule | undefined>(() => {
    return rules.length > 0 ? { ...rules[0] } : undefined;
  });

  const { data: ruleList } = useRuleListQuery();

  // 处理规则切换
  const handleRuleChange = (newRuleId: number) => {
    // 触发回调通知当前规则数据更改
    if (onRuleDataChange && selectedRuleId && currentRule) {
      onRuleDataChange(
        selectedRuleId,
        currentRule.performance,
        currentRule.numerical,
      );
    }

    // 查找新规则
    const newRule = rules.find(r => r.id === newRuleId);
    if (newRule) {
      setSelectedRuleId(newRuleId);
      setCurrentRule({ ...newRule });
    }
  };

  // 更新表演字段
  const handlePerformanceChange = (performance: any) => {
    setCurrentRule((prev: any) => (prev ? { ...prev, performance } : prev));

    // 可选：通知外部规则数据变化
    if (onRuleDataChange && selectedRuleId && currentRule) {
      onRuleDataChange(selectedRuleId, performance, currentRule.numerical);
    }
  };

  // 更新数值约束
  const handleNumericalChange = (numerical: any) => {
    setCurrentRule((prev: any) => (prev ? { ...prev, numerical } : prev));

    if (onRuleDataChange && selectedRuleId && currentRule) {
      onRuleDataChange(selectedRuleId, currentRule.performance, numerical);
    }
  };

  return (
    <div className="space-y-6">
      <RulesSection
        rules={ruleList || []} // 提供默认空数组
        currentRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />

      {currentRule && (
        <>
          <Section title="表演字段配置">
            <PerformanceEditor
              fields={currentRule.performance}
              onChange={handlePerformanceChange}
            />
          </Section>

          <Section title="数值约束配置">
            <NumericalEditor
              constraints={currentRule.numerical}
              onChange={handleNumericalChange}
            />
          </Section>
        </>
      )}
    </div>
  );
}
