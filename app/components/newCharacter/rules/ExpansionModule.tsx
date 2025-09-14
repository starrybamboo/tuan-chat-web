import { useAbilityByRuleAndRole, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";

interface ExpansionModuleProps {
  isEditing?: boolean;
  roleId: number;
  /**
   * 可选, 会默认选中对应的ruleId, 且不再展示选择规则的部分组件
   */
  ruleId?: number;
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束
 */
export default function ExpansionModule({
  roleId,
  ruleId,
  onLoadingChange, // 1. 在 props 中解构出 onLoadingChange
}: ExpansionModuleProps) {
  // 状态
  const selectedRuleId = ruleId ?? 1;

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();

  // 判断每个能力块是否使用规则模版数据
  // 只有当两个查询都完成且没有错误时才进行判断
  const isBasicUsingTemplate = !abilityQuery.isLoading && !ruleDetailQuery.isLoading
    && (!abilityQuery.data?.basicDefault || Object.keys(abilityQuery.data.basicDefault || {}).length === 0)
    && ruleDetailQuery.data?.basicDefault
    && Object.keys(ruleDetailQuery.data.basicDefault).length > 0;

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

  // 通用的数据分离逻辑函数
  const separateDataByTemplate = (
    currentData: Record<string, any>,
    templateData: Record<string, any>,
  ) => {
    const modified: Record<string, string> = {};
    const template: Record<string, string> = {};

    // 如果有当前数据，分离修改过的和模版的
    if (Object.keys(currentData).length > 0) {
      Object.entries(currentData).forEach(([key, value]) => {
        const stringValue = String(value || "");
        const templateValue = String(templateData[key] || "");

        if (templateData[key] !== undefined && templateValue === stringValue) {
          // 与模版一致的数据
          template[key] = stringValue;
        }
        else {
          // 修改过的数据
          modified[key] = stringValue;
        }
      });

      // 添加模版中存在但当前数据中不存在的项
      Object.entries(templateData).forEach(([key, value]) => {
        if (currentData[key] === undefined) {
          template[key] = String(value || "");
        }
      });
    }
    else {
      // 如果没有当前数据，所有都是模版数据
      Object.entries(templateData).forEach(([key, value]) => {
        template[key] = String(value || "");
      });
    }

    return { modified, template };
  };

  // 分离技能数据的逻辑
  const { modifiedSkills, templateSkills } = useMemo(() => {
    const abilitySkillData = abilityQuery.data?.skillDefault || {};
    const ruleSkillData = ruleDetailQuery.data?.skillDefault || {};
    const currentSkillData = localEdits.skillDefault || abilitySkillData;

    const { modified, template } = separateDataByTemplate(currentSkillData, ruleSkillData);
    return { modifiedSkills: modified, templateSkills: template };
  }, [abilityQuery.data?.skillDefault, ruleDetailQuery.data?.skillDefault, localEdits.skillDefault]);

  // 分离能力数据的逻辑
  const { modifiedAbilities, templateAbilities } = useMemo(() => {
    const abilityAbilityData = abilityQuery.data?.abilityDefault || {};
    const ruleAbilityData = ruleDetailQuery.data?.abilityFormula || {};
    const currentAbilityData = localEdits.abilityFormula || abilityAbilityData;

    const { modified, template } = separateDataByTemplate(currentAbilityData, ruleAbilityData);
    return { modifiedAbilities: modified, templateAbilities: template };
  }, [abilityQuery.data?.abilityDefault, ruleDetailQuery.data?.abilityFormula, localEdits.abilityFormula]);

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

  // 更新基础数值约束
  const handleBasicDefaultChange = (newData: Record<string, string>) => {
    setLocalEdits(prev => ({ ...prev, basicDefault: newData }));
  };

  // 通用的技能数据合并和更新函数
  const handleSkillChange = (
    newData: Record<string, string>,
    mergeWith?: Record<string, string>,
  ) => {
    const finalData = mergeWith ? { ...mergeWith, ...newData } : newData;
    setLocalEdits(prev => ({ ...prev, skillDefault: finalData }));
  };

  // 处理规则模版技能区域的变更
  const handleTemplateSkillChange = (newData: Record<string, string>) => {
    // 合并模板技能的变更和现有的自定义技能
    handleSkillChange(newData, modifiedSkills);
  };

  // 处理自定义技能区域的变更
  const handleModifiedSkillChange = (newData: Record<string, string>) => {
    // 合并自定义技能的变更和现有的模板技能
    handleSkillChange(newData, templateSkills);
  };

  // 通用的能力数据合并和更新函数
  const handleAbilityChange = (
    newData: Record<string, string>,
    mergeWith?: Record<string, string>,
  ) => {
    const finalData = mergeWith ? { ...mergeWith, ...newData } : newData;
    setLocalEdits(prev => ({ ...prev, abilityFormula: finalData }));
  };

  // 处理规则模版能力区域的变更
  const handleTemplateAbilityChange = (newData: Record<string, string>) => {
    // 合并模板能力的变更和现有的自定义能力
    handleAbilityChange(newData, modifiedAbilities);
  };

  // 处理自定义能力区域的变更
  const handleModifiedAbilityChange = (newData: Record<string, string>) => {
    // 合并自定义能力的变更和现有的模板能力
    handleAbilityChange(newData, templateAbilities);
  };

  // 检查加载状态
  const isLoading = ruleDetailQuery.isLoading || abilityQuery.isLoading || !renderData;

  // 2. 使用 useEffect 监听 isLoading 的变化
  useEffect(() => {
    // 当 isLoading 变化时，如果 onLoadingChange 存在，就调用它并传入最新的状态
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  return (
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
                    abilityId={abilityQuery.data?.abilityId || 0}
                  />
                </Section>

                <Section title="基础属性配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                  {isBasicUsingTemplate && (
                    <div className="alert alert-info mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span>当前显示的是基础属性规则模版，编辑后将保存为角色专属配置</span>
                    </div>
                  )}
                  <NumericalEditor
                    data={renderData.basicDefault}
                    onChange={handleBasicDefaultChange}
                    abilityId={abilityQuery.data?.abilityId || 0}
                    title="基础属性"
                    fieldType="basic"
                  />
                </Section>

                <Section title="能力配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                  <div className="space-y-6">
                    {/* 已修改的能力区域 */}
                    {Object.keys(modifiedAbilities).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-success">已自定义的能力</h4>
                          <div className="badge badge-success badge-sm">{Object.keys(modifiedAbilities).length}</div>
                        </div>
                        <div className="alert alert-success">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>这些能力已经过自定义修改，不同于规则模版</span>
                        </div>
                        <NumericalEditor
                          data={modifiedAbilities}
                          onChange={handleModifiedAbilityChange}
                          abilityId={abilityQuery.data?.abilityId || 0}
                          title="自定义能力"
                          fieldType="ability"
                        />
                      </div>
                    )}

                    {/* 规则模版能力区域 - 可折叠 */}
                    {Object.keys(templateAbilities).length > 0 && (
                      <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" className="peer" />
                        <div className="collapse-title text-lg font-medium flex items-center gap-2">
                          <span>规则模版能力</span>
                          <div className="badge badge-neutral badge-sm">{Object.keys(templateAbilities).length}</div>
                          <div className="text-sm text-base-content/60 ml-auto">
                            点击展开查看规则模版中的能力
                          </div>
                        </div>
                        <div className="collapse-content">
                          <div className="pt-4 space-y-4">
                            <div className="alert alert-info">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              <span>这些能力使用规则模版的默认值，编辑后将移动到上方的自定义区域</span>
                            </div>
                            <NumericalEditor
                              data={templateAbilities}
                              onChange={handleTemplateAbilityChange}
                              abilityId={abilityQuery.data?.abilityId || 0}
                              title="模版能力"
                              fieldType="ability"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 当没有任何能力时的提示 */}
                    {Object.keys(modifiedAbilities).length === 0 && Object.keys(templateAbilities).length === 0 && (
                      <div className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <span>当前规则没有配置任何能力，可以通过添加字段来创建能力</span>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="技能配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                  <div className="space-y-6">
                    {/* 已修改的技能区域 */}
                    {Object.keys(modifiedSkills).length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold text-success">已自定义的技能</h4>
                          <div className="badge badge-success badge-sm">{Object.keys(modifiedSkills).length}</div>
                        </div>
                        <div className="alert alert-success">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>这些技能已经过自定义修改，不同于规则模版</span>
                        </div>
                        <NumericalEditor
                          data={modifiedSkills}
                          onChange={handleModifiedSkillChange}
                          abilityId={abilityQuery.data?.abilityId || 0}
                          title="自定义技能"
                          fieldType="skill"
                        />
                      </div>
                    )}

                    {/* 规则模版技能区域 - 可折叠 */}
                    {Object.keys(templateSkills).length > 0 && (
                      <div className="collapse collapse-arrow bg-base-200">
                        <input type="checkbox" className="peer" />
                        <div className="collapse-title text-lg font-medium flex items-center gap-2">
                          <span>规则模版技能</span>
                          <div className="badge badge-neutral badge-sm">{Object.keys(templateSkills).length}</div>
                          <div className="text-sm text-base-content/60 ml-auto">
                            点击展开查看规则模版中的技能
                          </div>
                        </div>
                        <div className="collapse-content">
                          <div className="pt-4 space-y-4">
                            <div className="alert alert-info">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              <span>这些技能使用规则模版的默认值，编辑后将移动到上方的自定义区域</span>
                            </div>
                            <NumericalEditor
                              data={templateSkills}
                              onChange={handleTemplateSkillChange}
                              abilityId={abilityQuery.data?.abilityId || 0}
                              title="模版技能"
                              fieldType="skill"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 当没有任何技能时的提示 */}
                    {Object.keys(modifiedSkills).length === 0 && Object.keys(templateSkills).length === 0 && (
                      <div className="alert alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                        <span>当前规则没有配置任何技能，可以通过添加字段来创建技能</span>
                      </div>
                    )}
                  </div>
                </Section>
              </>
            )
          )}
    </div>
  );
}
