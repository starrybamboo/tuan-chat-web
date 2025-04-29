import type { GameRule } from "../types";
import { useEffect, useState } from "react";
import { useRuleDetailQuery, useRulePageMutation } from "../../../../api/queryHooks";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";
// import { defaultRules } from "./rules";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void; // 可选回调
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束，完全独立于角色
 */
export default function ExpansionModule({
  onRuleDataChange,
}: ExpansionModuleProps) {
  const ruleListMutation = useRulePageMutation();

  const [rules, setRules] = useState<GameRule[]>([]); // 规则列表

  // 管理当前选择的规则和规则数据
  const [selectedRuleId, setSelectedRuleId] = useState<number>(
    rules.length > 0 ? rules[0].id : 0,
  );

  // 规则详情
  // const [currentRule, setCurrentRule] = useState<GameRule | undefined>(() => {
  //   return rules.length > 0 ? { ...rules[0] } : undefined;
  // });

  // 规则详情查询
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await ruleListMutation.mutateAsync({ pageNo: 1, pageSize: 5 });
        if (result && result.length > 0) {
          setRules(result);
          setSelectedRuleId(result[0].id);
          // setCurrentRule({ ...result[0] });
        }
      }
      catch (error) {
        console.error("获取规则列表失败:", error);
      }
    };

    fetchRules();
  }, []); // 仅在组件挂载时执行一次

  // useEffect(() => {
  //   if (ruleDetailQuery.data) {
  //     setCurrentRule(ruleDetailQuery.data);
  //   }
  // }, [ruleDetailQuery.data]);

  // 处理规则切换
  const handleRuleChange = (newRuleId: number) => {
    // 触发回调通知当前规则数据更改
    if (onRuleDataChange && selectedRuleId && ruleDetailQuery.data) {
      onRuleDataChange(
        selectedRuleId,
        ruleDetailQuery.data.performance,
        ruleDetailQuery.data.numerical,
      );
    }

    // 查找新规则
    const newRule = rules.find(r => r.id === newRuleId);
    if (newRule) {
      setSelectedRuleId(newRuleId);
      // setCurrentRule({ ...newRule });
    }
  };

  // 更新表演字段
  const handlePerformanceChange = (performance: any) => {
    // setCurrentRule((prev: any) => (prev ? { ...prev, performance } : prev));

    // 可选：通知外部规则数据变化
    if (onRuleDataChange && selectedRuleId && ruleDetailQuery.data) {
      onRuleDataChange(selectedRuleId, performance, ruleDetailQuery.data.numerical);
    }
  };

  // 更新数值约束
  const handleNumericalChange = (numerical: any) => {
    // setCurrentRule((prev: any) => (prev ? { ...prev, numerical } : prev));

    if (onRuleDataChange && selectedRuleId && ruleDetailQuery.data) {
      onRuleDataChange(selectedRuleId, ruleDetailQuery.data.performance, numerical);
    }
  };

  return (
    <div className="space-y-6">
      <RulesSection
        rules={rules} // 提供默认空数组
        currentRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />

      {ruleDetailQuery.data && (
        <>
          <Section title="表演字段配置">
            <PerformanceEditor
              fields={ruleDetailQuery.data.performance}
              onChange={handlePerformanceChange}
            />
          </Section>

          <Section title="数值约束配置">
            <NumericalEditor
              constraints={ruleDetailQuery.data.numerical}
              onChange={handleNumericalChange}
            />
          </Section>
        </>
      )}
    </div>
  );
}
