import ImportWithStCmd from "@/components/newCharacter/rules/ImportWithStCmd";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import Section from "../Section";
import { ConfigurationSection } from "./ConfigurationSection";
import PerformanceEditor from "./PerformanceEditor";

interface ExpansionModuleProps {
  isEditing?: boolean;
  roleId: number;
  /**
   * 可选, 会默认选中对应的ruleId, 且不再展示选择规则的部分组件
   */
  ruleId?: number;
  onLoadingChange?: (isLoading: boolean) => void;
  isStImportModalOpen?: boolean;
  onStImportModalClose?: () => void;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束
 */
export default function ExpansionModule({
  roleId,
  ruleId,
  onLoadingChange, // 1. 在 props 中解构出 onLoadingChange
  isStImportModalOpen = false,
  onStImportModalClose,
}: ExpansionModuleProps) {
  // 状态
  const selectedRuleId = ruleId ?? 1;

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 初始化能力数据
  useEffect(() => {
    if (ruleDetailQuery.data && !abilityQuery.data && !abilityQuery.isLoading) {
      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data?.ruleId || 0,
        roleId,
        act: ruleDetailQuery.data?.actTemplate || {},
        basic: ruleDetailQuery.data?.basicDefault || {},
        ability: ruleDetailQuery.data?.abilityFormula || {},
        skill: ruleDetailQuery.data?.skillDefault || {},
      });
    }
  }, [ruleDetailQuery.data, abilityQuery.data, abilityQuery.isLoading, roleId, setRoleAbilityMutation]);

  // 用于存储本地编辑状态的数据
  const [localEdits, setLocalEdits] = useState<{
    actTemplate?: any;
    basicDefault?: any;
    abilityFormula?: any;
    skillDefault?: any;
  }>({});

  // 当 roleId 变化时，重置本地编辑状态，防止显示上一个角色的内容
  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setLocalEdits({});
  }, [roleId]);

  // 构建当前渲染所需的数据
  const renderData = useMemo(() => {
    // 等待所有必要的数据加载完成
    if (!ruleDetailQuery.data || ruleDetailQuery.isLoading || abilityQuery.isLoading) {
      return null;
    }

    // 确保查询返回的数据与当前的 roleId 匹配，防止显示错误的角色数据
    if (abilityQuery.data && abilityQuery.data.roleId !== roleId) {
      return null;
    }

    // 获取基础数据（优先使用 ability 数据，其次使用 rule 数据）
    const baseActTemplate = abilityQuery.data?.actTemplate ?? ruleDetailQuery.data?.actTemplate ?? {};

    // 对于基础属性：如果角色没有专属配置或为空对象，则使用规则模版
    const baseBasicDefault = (abilityQuery.data?.basicDefault && Object.keys(abilityQuery.data.basicDefault).length > 0)
      ? abilityQuery.data.basicDefault
      : (ruleDetailQuery.data?.basicDefault || {});

    // 对于能力配置：如果角色没有专属配置或为空对象，则使用规则模版
    const baseAbilityFormula = (abilityQuery.data?.abilityDefault && Object.keys(abilityQuery.data.abilityDefault).length > 0)
      ? abilityQuery.data.abilityDefault
      : (ruleDetailQuery.data?.abilityFormula || {});

    // 对于技能配置：如果角色没有专属配置或为空对象，则使用规则模版
    const baseSkillDefault = (abilityQuery.data?.skillDefault && Object.keys(abilityQuery.data.skillDefault).length > 0)
      ? abilityQuery.data.skillDefault
      : (ruleDetailQuery.data?.skillDefault || {});

    // 合并本地编辑的数据
    return {
      ruleId: ruleDetailQuery.data.ruleId,
      ruleName: ruleDetailQuery.data.ruleName || "",
      ruleDescription: ruleDetailQuery.data.ruleDescription || "",
      actTemplate: localEdits.actTemplate ?? baseActTemplate,
      basicDefault: localEdits.basicDefault ?? baseBasicDefault,
      abilityFormula: localEdits.abilityFormula ?? baseAbilityFormula,
      skillDefault: localEdits.skillDefault ?? baseSkillDefault,
    };
  }, [abilityQuery.data, ruleDetailQuery.data, abilityQuery.isLoading, ruleDetailQuery.isLoading, localEdits, roleId]);

  // 更新表演字段
  const handleActTemplateChange = (actTemplate: Record<string, string>) => {
    setLocalEdits(prev => ({ ...prev, actTemplate }));
  };

  // 通用的基础属性数据合并和更新函数
  // 处理基础属性变更
  const handleBasicChange = (newData: Record<string, any>) => {
    setLocalEdits(prev => ({ ...prev, basicDefault: newData }));
  };

  // 处理技能变更
  const handleSkillChange = (newData: Record<string, any>) => {
    setLocalEdits(prev => ({ ...prev, skillDefault: newData }));
  };

  // 处理能力变更
  const handleAbilityChange = (newData: Record<string, any>) => {
    setLocalEdits(prev => ({ ...prev, abilityFormula: newData }));
  };

  // 检查加载状态
  const isLoading = ruleDetailQuery.isLoading || abilityQuery.isLoading || !renderData;

  // 2. 使用 useEffect 监听 isLoading 的变化
  useEffect(() => {
    // 当 isLoading 变化时，如果 onLoadingChange 存在，就调用它并传入最新的状态
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
    <>
      <div key={`expansion-module-${roleId}-${selectedRuleId}`} className="space-y-6">
        {/* 加载状态 */}
        {isLoading
          ? (
              <div className="space-y-6">
                {/* 表演字段配置加载骨架 */}
                <Section title="表演字段配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-base-300 rounded w-1/4"></div>
                    <div className="space-y-3">
                      <div className="h-10 bg-base-300 rounded"></div>
                      <div className="h-10 bg-base-300 rounded"></div>
                      <div className="h-10 bg-base-300 rounded"></div>
                    </div>
                  </div>
                </Section>

                {/* 基础属性配置加载骨架 */}
                <Section title="基础属性配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-base-300 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                    </div>
                  </div>
                </Section>

                {/* 能力配置加载骨架 */}
                <Section title="能力配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-base-300 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                    </div>
                  </div>
                </Section>

                {/* 技能配置加载骨架 */}
                <Section title="技能配置" className="rounded-2xl border-2 border-base-content/10 bg-base-100">
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-base-300 rounded w-1/3"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                      <div className="h-16 bg-base-300 rounded"></div>
                    </div>
                    <div className="h-10 bg-base-300 rounded w-1/2"></div>
                  </div>
                </Section>
              </div>
            )
          : (
        /* 规则详情区域 */
              renderData && (
                <>
                  <Section title="表演字段配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                    <PerformanceEditor
                      fields={renderData.actTemplate}
                      onChange={handleActTemplateChange}
                      abilityData={renderData.actTemplate}
                      roleId={roleId}
                      ruleId={selectedRuleId}
                    />
                  </Section>

                  <ConfigurationSection
                    title="基础属性配置"
                    abilityData={abilityQuery.data?.basicDefault || {}}
                    ruleData={ruleDetailQuery.data?.basicDefault || {}}
                    localEdits={localEdits.basicDefault}
                    onDataChange={handleBasicChange}
                    roleId={roleId}
                    ruleId={selectedRuleId}
                    fieldType="basic"
                    customLabel="基础属性"
                  />

                  <ConfigurationSection
                    title="能力配置"
                    abilityData={abilityQuery.data?.abilityDefault || {}}
                    ruleData={ruleDetailQuery.data?.abilityFormula || {}}
                    localEdits={localEdits.abilityFormula}
                    onDataChange={handleAbilityChange}
                    roleId={roleId}
                    ruleId={selectedRuleId}
                    fieldType="ability"
                    customLabel="能力"
                  />

                  <ConfigurationSection
                    title="技能配置"
                    abilityData={abilityQuery.data?.skillDefault || {}}
                    ruleData={ruleDetailQuery.data?.skillDefault || {}}
                    localEdits={localEdits.skillDefault}
                    onDataChange={handleSkillChange}
                    roleId={roleId}
                    ruleId={selectedRuleId}
                    fieldType="skill"
                    customLabel="技能"
                  />

                </>
              )
            )}
      </div>

      {/* ST导入弹窗 */}
      {isStImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onStImportModalClose}>
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">使用ST指令快速导入配置</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={onStImportModalClose}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <ImportWithStCmd
                  roleId={roleId}
                  ruleId={selectedRuleId}
                  onImportSuccess={onStImportModalClose}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
