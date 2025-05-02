import type { GameRule } from "../types";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery, useRulePageMutation } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
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

// 嵌套结构转换
function wrapIntoNested(keyPath: string[], valueObject: Record<string, any>) {
  const result: any = {};
  let current = result;

  for (let i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    current[key] = {};
    current = current[key];
  }
  current[keyPath[keyPath.length - 1]] = valueObject;
  return result;
}

// 合并能力和规则数值
function deepOverrideTargetWithSource(
  target: Record<string, any>,
  source: Record<string, any>,
) {
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
      result[key] = Object.prototype.hasOwnProperty.call(source, key)
        ? source[key]
        : target[key];
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
  // 分页和搜索状态
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");

  // 状态
  const [rules, setRules] = useState<GameRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<number>(0);
  const [localRuleData, setLocalRuleData] = useState<GameRule | null>(null);

  // API Hooks
  const rulePageMutation = useRulePageMutation();
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 规则分页获取
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await rulePageMutation.mutateAsync({
          pageNo: pageNum,
          pageSize,
          keyword,
        });
        if (result && result.length > 0) {
          setRules(result);
          // 如果未选择规则，默认选第一个
          if (!selectedRuleId) {
            setSelectedRuleId(result[0].id);
          }
        }
      }
      catch (err) {
        console.error("规则加载失败:", err);
      }
    };
    fetchRules();
  }, [pageNum, pageSize, keyword]);

  // 规则详情合并逻辑
  const currentRuleData = useMemo(() => {
    if (abilityQuery.data?.id) {
      return abilityQuery.data;
    }
    else if (ruleDetailQuery.data) {
      // 自动补全能力数据
      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data.id,
        roleId,
        act: ruleDetailQuery.data.performance || {},
        ability: flattenConstraints(ruleDetailQuery.data.numerical || {}) || {},
      });
      return ruleDetailQuery.data;
    }
    return null;
  }, [abilityQuery.data, ruleDetailQuery.data]);

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
  }, [currentRuleData]);

  // ruleId 选择变化
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

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword);
    setPageNum(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="搜索规则..."
            value={keyword}
            onChange={e => handleSearch(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageNum(1);
            }}
            className="px-3 py-2 border rounded-md"
          >
            <option value={10}>10条/页</option>
            <option value={20}>20条/页</option>
            <option value={50}>50条/页</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPageNum(p => Math.max(p - 1, 1))}
            disabled={pageNum === 1}
            className="px-3 py-2 border rounded-md disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-2">
            第
            {pageNum}
            {" "}
            页
          </span>
          <button
            onClick={() => setPageNum(p => p + 1)}
            className="px-3 py-2 border rounded-md"
          >
            下一页
          </button>
        </div>
      </div>

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
              abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
            />
          </Section>

          <Section title="数值约束配置">
            <NumericalEditor
              constraints={{ ...localRuleData.numerical }}
              onChange={handleNumericalChange}
              abilityId={abilityQuery.data?.id ? localRuleData.id : 0}
            />
          </Section>
        </>
      )}
    </div>
  );
}
