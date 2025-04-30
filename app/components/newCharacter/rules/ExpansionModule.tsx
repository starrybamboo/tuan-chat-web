import type { GameRule } from "../types";
import { useEffect, useMemo, useState } from "react";
import { useAbilityByRuleAndRole } from "../../../../api/hooks/abilityQueryHooks";
import { useRuleDetailQuery, useRulePageMutation } from "../../../../api/hooks/ruleQueryHooks";
import Section from "../Section";
// import AbilityModule from "./AbilityModule";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";
// import { defaultRules } from "./rules";
import RulesSection from "./RulesSection";

interface ExpansionModuleProps {
  isEditing?: boolean; // 是否处于编辑模式
  onRuleDataChange?: (ruleId: number, performance: any, numerical: any) => void; // 可选回调
  roleId: number;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束，完全独立于角色
 */
export default function ExpansionModule({
  // isEditing = false,
  onRuleDataChange,
  roleId,
}: ExpansionModuleProps) {
  const [rules, setRules] = useState<GameRule[]>([]); // 规则列表

  // 管理当前选择的规则和规则数据
  const [selectedRuleId, setSelectedRuleId] = useState<number>(
    rules.length > 0 ? rules[0].id : 0,
  );
  const ruleListMutation = useRulePageMutation();
  // 能力列表
  const abilityListQuery = useAbilityByRuleAndRole(roleId, selectedRuleId);
  // 规则详情查询
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId);

  // 合并规则数据，优先使用能力列表数据
  const currentRuleData = useMemo(() => {
    if (abilityListQuery.data?.id) {
      return abilityListQuery.data;
    }
    return ruleDetailQuery.data;
  }, [abilityListQuery.data, ruleDetailQuery.data]);

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

  // 处理规则切换
  const handleRuleChange = (newRuleId: number) => {
    // 触发回调通知当前规则数据更改
    if (onRuleDataChange && selectedRuleId && currentRuleData) {
      onRuleDataChange(
        selectedRuleId,
        currentRuleData.performance,
        currentRuleData.numerical,
      );
    }

    // 查找新规则
    const newRule = rules.find(r => r.id === newRuleId);
    if (newRule) {
      setSelectedRuleId(newRuleId);
    }
  };

  // 更新表演字段
  const handlePerformanceChange = (performance: any) => {
    if (onRuleDataChange && selectedRuleId && currentRuleData) {
      onRuleDataChange(selectedRuleId, performance, currentRuleData.numerical);
    }
  };

  // 更新数值约束
  const handleNumericalChange = (numerical: any) => {
    if (onRuleDataChange && selectedRuleId && currentRuleData) {
      onRuleDataChange(selectedRuleId, currentRuleData.performance, numerical);
    }
  };

  // 创建能力
  // const handleCreateAbility = (ruleId: number, roleId: number) => {
  //   setRoleAbility({
  //     ruleId,
  //     roleId,
  //     act: currentRule?.performance || { default: "default" },
  //     ability: {},
  //   });
  //   queryClient.invalidateQueries({ queryKey: ["ability", roleId] });
  // };

  return (
    <div className="space-y-6">
      <RulesSection
        rules={rules} // 提供默认空数组
        currentRuleId={selectedRuleId}
        onRuleChange={handleRuleChange}
      />

      {currentRuleData && (
        <>
          <Section title="表演字段配置">
            <PerformanceEditor
              fields={currentRuleData.performance}
              onChange={handlePerformanceChange}
              abilityData={currentRuleData.performance}
              abilityId={abilityListQuery.data?.id ? currentRuleData.id : 0}
              roleId={roleId}
              ruleId={ruleDetailQuery.data?.id ? currentRuleData.id : 0}
            />
          </Section>

          <Section title="数值约束配置">
            <NumericalEditor
              constraints={currentRuleData.numerical}
              onChange={handleNumericalChange}
            />
          </Section>
        </>
      )}
    </div>
  );
}
