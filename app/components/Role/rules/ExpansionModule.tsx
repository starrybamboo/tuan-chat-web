import { DownloadSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation, useUpdateRoleAbilityByRoleIdMutation } from "api/hooks/abilityQueryHooks";
import { useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { CloseIcon, EditIcon, SaveIcon, WrenchIcon } from "app/icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImportWithStCmd from "@/components/Role/rules/ImportWithStCmd";
import CopywritingEditor from "../Editors/CopywritingEditor";
import Section from "../Editors/Section";
import { ConfigurationSection } from "./ConfigurationSection";
import NumericalEditorSmall from "./NumericalEditorSmall";
import PerformanceEditor from "./PerformanceEditor";
import PerformanceEditorSmall from "./PerformanceEditorSmall";

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
  onOpenStImportModal?: () => void;
  onOpenAIGenerateModal?: () => void;
  size?: "default" | "small";
}

/**
 * 扩展模块组件
 * 负责展示规则选择、表演字段和数值约束
 */
export default function ExpansionModule({
  isEditing: globalIsEditing,
  roleId,
  ruleId,
  onLoadingChange, // 1. 在 props 中解构出 onLoadingChange
  isStImportModalOpen = false,
  onStImportModalClose,
  onOpenStImportModal,
  onOpenAIGenerateModal,
  size = "default",
}: ExpansionModuleProps) {
  const isEditingControlled = typeof globalIsEditing === "boolean";
  const isRuleEditing = Boolean(globalIsEditing);

  // ״̬
  const selectedRuleId = ruleId ?? 1;

  // 角色类型查询（用于条件渲染Tab）
  const roleQuery = useGetRoleQuery(roleId);
  const isDiceMaiden = !!(roleQuery.data?.data?.diceMaiden || roleQuery.data?.data?.type === 1);

  // 当前选中的Tab，依据角色类型设置默认
  const [activeTab, setActiveTab] = useState<"basic" | "ability" | "skill" | "act">("basic");
  const isSmall = size === "small";

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();
  const { mutate: updateFieldAbility } = useUpdateRoleAbilityByRoleIdMutation();
  const [copywritingSaveMsg, setCopywritingSaveMsg] = useState<string>("");
  const [isCopywritingPreview, setIsCopywritingPreview] = useState<boolean>(true);
  const prevGlobalIsEditingRef = useRef(globalIsEditing);
  const showCopywritingPreview = isEditingControlled ? !globalIsEditing : isCopywritingPreview;

  // 初始化能力数据 - 现在不再自动创建,需要用户手动触发
  // useEffect(() => {
  //   if (ruleDetailQuery.data && !abilityQuery.data && !abilityQuery.isLoading) {
  //     setRoleAbilityMutation.mutate({
  //       ruleId: ruleDetailQuery.data?.ruleId || 0,
  //       roleId,
  //       act: ruleDetailQuery.data?.actTemplate || {},
  //       basic: ruleDetailQuery.data?.basicDefault || {},
  //       ability: ruleDetailQuery.data?.abilityFormula || {},
  //       skill: ruleDetailQuery.data?.skillDefault || {},
  //     });
  //   }
  // }, [ruleDetailQuery.data, abilityQuery.data, abilityQuery.isLoading, roleId, setRoleAbilityMutation]);

  // 用于存储本地编辑状态的数据
  const [localEdits, setLocalEdits] = useState<{
    actTemplate?: any;
    basicDefault?: any;
    abilityFormula?: any;
    skillDefault?: any;
    copywritingTemplates?: Record<string, string[]>;
  }>({});

  // 当 roleId 或 ruleId 变化时，重置本地编辑状态，防止显示上一次编辑的内容
  useEffect(() => {
    setLocalEdits({});
  }, [roleId, selectedRuleId]);

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

    // 解析后端的骰娘文案（extra.copywriting），作为基础值
    const baseCopywritingTemplates = abilityQuery.data?.extraCopywriting ?? {};

    // 合并本地编辑的数据
    return {
      ruleId: ruleDetailQuery.data.ruleId,
      ruleName: ruleDetailQuery.data.ruleName || "",
      ruleDescription: ruleDetailQuery.data.ruleDescription || "",
      actTemplate: localEdits.actTemplate ?? baseActTemplate,
      basicDefault: localEdits.basicDefault ?? baseBasicDefault,
      abilityFormula: localEdits.abilityFormula ?? baseAbilityFormula,
      skillDefault: localEdits.skillDefault ?? baseSkillDefault,
      copywritingTemplates: localEdits.copywritingTemplates ?? baseCopywritingTemplates,
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

  // 处理骰娘文案变更（本地临时对象 Record<string, string[]>）
  const handleCopywritingChange = (newData: Record<string, string[]>) => {
    setLocalEdits(prev => ({ ...prev, copywritingTemplates: newData }));
  };

  // 保存骰娘文案到 ability.extra.copywriting（序列化为字符串）
  const handleCopywritingSave = useCallback(() => {
    const copywritingData = localEdits.copywritingTemplates ?? renderData?.copywritingTemplates ?? {};
    const serializedData = JSON.stringify(copywritingData);

    const payload = {
      roleId,
      ruleId: selectedRuleId,
      act: {}, // 不修改表演字段
      basic: {}, // 不修改基础属性
      ability: {}, // 不修改能力字段
      skill: {}, // 不修改技能字段
      extra: {
        copywriting: serializedData,
      },
    };

    updateFieldAbility(payload, {
      onSuccess: () => {
        // 保存成功后切换回预览模式，并清空本地编辑状态让数据从后端重新加载
        setIsCopywritingPreview(true);
        setLocalEdits(prev => ({ ...prev, copywritingTemplates: undefined }));
      },
      onError: (e: any) => {
        console.error("保存骰娘文案失败:", e);
        console.error("错误详情:", e?.body || e?.message || e);
        setCopywritingSaveMsg(`保存失败: ${e?.body?.message || e?.message || "请稍后重试"}`);
        setTimeout(() => setCopywritingSaveMsg(""), 3000);
      },
    });
  }, [localEdits.copywritingTemplates, renderData?.copywritingTemplates, roleId, selectedRuleId, updateFieldAbility]);

  // 受控编辑模式下：顶部总编辑从开到关时，自动提交骰娘文案编辑
  useEffect(() => {
    if (!isEditingControlled)
      return;

    const wasEditing = prevGlobalIsEditingRef.current === true;
    if (wasEditing && !globalIsEditing && localEdits.copywritingTemplates !== undefined) {
      handleCopywritingSave();
    }
    prevGlobalIsEditingRef.current = globalIsEditing;
  }, [globalIsEditing, handleCopywritingSave, isEditingControlled, localEdits.copywritingTemplates]);

  // 检查是否规则未创建
  const isRuleNotCreated = !abilityQuery.isLoading && !abilityQuery.data && ruleDetailQuery.data;

  // 手动创建规则数据
  const handleCreateRule = () => {
    if (ruleDetailQuery.data) {
      setRoleAbilityMutation.mutate({
        ruleId: ruleDetailQuery.data?.ruleId || 0,
        roleId,
        act: ruleDetailQuery.data?.actTemplate || {},
        basic: ruleDetailQuery.data?.basicDefault || {},
        ability: ruleDetailQuery.data?.abilityFormula || {},
        skill: ruleDetailQuery.data?.skillDefault || {},
      });
    }
  };

  // 检查加载状态
  const isLoading = ruleDetailQuery.isLoading || abilityQuery.isLoading || !renderData;

  // 2. 使用 useEffect 监听 isLoading 的变化
  useEffect(() => {
    // 当 isLoading 变化时，如果 onLoadingChange 存在，就调用它并传入最新的状态
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // 渲染当前 Tab 内容
  const renderActiveTabContent = () => {
    if (!renderData)
      return null;

    if (activeTab === "basic") {
      return isSmall
        ? (
            <NumericalEditorSmall
              data={renderData.basicDefault || {}}
              onChange={handleBasicChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              title="基础属性"
              fieldType="basic"
            />
          )
        : (
            <ConfigurationSection
              key="basic"
              // title="基础属性配置"
              abilityData={abilityQuery.data?.basicDefault || {}}
              ruleData={ruleDetailQuery.data?.basicDefault || {}}
              localEdits={localEdits.basicDefault}
              onDataChange={handleBasicChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              isEditing={isRuleEditing}
              fieldType="basic"
              customLabel="基础属性"
              hideExternalTitlesOnMobile
            />
          );
    }
    if (activeTab === "ability") {
      return isSmall
        ? (
            <NumericalEditorSmall
              data={renderData.abilityFormula || {}}
              onChange={handleAbilityChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              title="能力"
              fieldType="ability"
            />
          )
        : (
            <ConfigurationSection
              key="ability"
              // title="能力配置"
              abilityData={abilityQuery.data?.abilityDefault || {}}
              ruleData={ruleDetailQuery.data?.abilityFormula || {}}
              localEdits={localEdits.abilityFormula}
              onDataChange={handleAbilityChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              isEditing={isRuleEditing}
              fieldType="ability"
              customLabel="能力"
              hideExternalTitlesOnMobile
            />
          );
    }
    if (activeTab === "skill") {
      return isSmall
        ? (
            <NumericalEditorSmall
              data={renderData.skillDefault || {}}
              onChange={handleSkillChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              title="技能"
              fieldType="skill"
            />
          )
        : (
            <ConfigurationSection
              key="skill"
              // title="技能配置"
              abilityData={abilityQuery.data?.skillDefault || {}}
              ruleData={ruleDetailQuery.data?.skillDefault || {}}
              localEdits={localEdits.skillDefault}
              onDataChange={handleSkillChange}
              roleId={roleId}
              ruleId={selectedRuleId}
              isEditing={isRuleEditing}
              fieldType="skill"
              customLabel="技能"
              hideExternalTitlesOnMobile
            />
          );
    }
    // act
    return isSmall
      ? (
          <PerformanceEditorSmall
            fields={renderData.actTemplate}
            onChange={handleActTemplateChange}
            abilityData={renderData.actTemplate}
            roleId={roleId}
            ruleId={selectedRuleId}
          />
        )
      : (
          <Section
            key="act"
            title="表演字段配置"
            className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
            collapsible={false}
            hideTitleOnMobile
          >
            <PerformanceEditor
              fields={renderData.actTemplate}
              onChange={handleActTemplateChange}
              abilityData={renderData.actTemplate}
              roleId={roleId}
              ruleId={selectedRuleId}
              isEditing={isRuleEditing}
              hideTitleOnMobile
            />
          </Section>
        );
  };

  const hasQuickTools = Boolean(onOpenStImportModal || onOpenAIGenerateModal);
  const hasDesktopQuickTools = hasQuickTools && !isSmall;
  const desktopConfigButtonClass = "md:h-10 md:min-h-10 md:px-4 md:text-sm md:font-medium";
  const desktopQuickToolButtonClass = "btn btn-sm h-10 min-h-10 rounded-lg px-4 text-sm font-medium";

  const tabButtons = !isDiceMaiden
    ? (
        <div className={`flex min-w-0 items-center gap-1 md:gap-2 rounded-lg ${isSmall ? "w-full" : ""}`}>
          <div className={`flex min-w-0 flex-1 flex-nowrap gap-1 md:flex-nowrap md:justify-start md:gap-3 ${isSmall ? "" : ""}`}>
            <button
              type="button"
              className={`btn ${isSmall ? "btn-sm" : "btn-md"} h-10 min-h-10 flex-none px-3 text-sm whitespace-nowrap rounded-lg ${isSmall ? "" : desktopConfigButtonClass} ${activeTab === "basic" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("basic")}
            >
              <span className="md:hidden">基础</span>
              <span className="hidden md:inline">基础配置</span>
            </button>
            <button
              type="button"
              className={`btn ${isSmall ? "btn-sm" : "btn-md"} h-10 min-h-10 flex-none px-3 text-sm whitespace-nowrap rounded-lg ${isSmall ? "" : desktopConfigButtonClass} ${activeTab === "ability" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("ability")}
            >
              <span className="md:hidden">能力</span>
              <span className="hidden md:inline">能力配置</span>
            </button>
            <button
              type="button"
              className={`btn ${isSmall ? "btn-sm" : "btn-md"} h-10 min-h-10 flex-none px-3 text-sm whitespace-nowrap rounded-lg ${isSmall ? "" : desktopConfigButtonClass} ${activeTab === "skill" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("skill")}
            >
              <span className="md:hidden">技能</span>
              <span className="hidden md:inline">技能配置</span>
            </button>
            <button
              type="button"
              className={`btn ${isSmall ? "btn-sm" : "btn-md"} h-10 min-h-10 flex-none px-3 text-sm whitespace-nowrap rounded-lg ${isSmall ? "" : desktopConfigButtonClass} ${activeTab === "act" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("act")}
            >
              <span className="md:hidden">表演</span>
              <span className="hidden md:inline">表演配置</span>
            </button>
          </div>
          {hasDesktopQuickTools && (
            <div className="hidden shrink-0 items-center gap-2 md:flex">
              {onOpenStImportModal && (
                <button
                  type="button"
                  onClick={onOpenStImportModal}
                  className={`${desktopQuickToolButtonClass} inline-flex items-center gap-2 bg-info/70 text-info-content`}
                >
                  <DownloadSimpleIcon className="size-4" weight="bold" aria-hidden="true" />
                  ST导入
                </button>
              )}
              {onOpenAIGenerateModal && (
                <button
                  type="button"
                  onClick={onOpenAIGenerateModal}
                  className={`${desktopQuickToolButtonClass} inline-flex items-center gap-2 bg-info/70 text-info-content`}
                >
                  <SparkleIcon className="size-4" weight="fill" aria-hidden="true" />
                  AI生成
                </button>
              )}
            </div>
          )}
          {hasQuickTools && (
            <div className={`dropdown md:hidden ${isSmall ? "" : "dropdown-end"}`}>
              <button
                type="button"
                tabIndex={0}
                className={`btn ${isSmall ? "btn-sm" : "btn-md"} btn-square h-10 w-10 min-h-10 md:h-12 md:w-12 md:min-h-12 rounded-full`}
                aria-label="打开导入和生成功能"
              >
                <WrenchIcon className="w-5 h-5" />
              </button>
              <ul tabIndex={0} className="dropdown-content z-20 menu p-2 shadow-lg bg-base-100 rounded-box w-32 border border-base-content/10">
                {onOpenStImportModal && (
                  <li>
                    <button type="button" onClick={onOpenStImportModal}>
                      ST导入
                    </button>
                  </li>
                )}
                {onOpenAIGenerateModal && (
                  <li>
                    <button type="button" onClick={onOpenAIGenerateModal}>
                      AI生成
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )
    : null;

  return (
    <>
      <div key={`expansion-module-${roleId}-${selectedRuleId}`} className={isSmall ? "space-y-3" : "space-y-4"}>
        {/* 规则未创建状态 */}
        {isRuleNotCreated
          ? (
              <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
                <div className="card-body items-center text-center py-16">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold mb-2">规则尚未创建</h3>
                  <p className="text-base-content/70 mb-6">
                    该角色还未配置此规则系统,点击下方按钮开始创建
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateRule}
                  >
                    创建规则配置
                  </button>
                </div>
              </div>
            )
          : isLoading
            ? (
                <div className="space-y-6">
                  {/* 骨架屏 - 模拟扩展模块 */}
                  <div className="flex gap-2">
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                    <div className="skeleton h-10 w-20 rounded-lg"></div>
                  </div>
                  <div className="card-sm md:card-xl bg-base-100 shadow-xs md:rounded-xl md:border-2 border-base-content/10">
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="skeleton h-6 w-32"></div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="skeleton h-10 w-full"></div>
                          <div className="skeleton h-10 w-full"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="skeleton h-10 w-full"></div>
                          <div className="skeleton h-10 w-full"></div>
                        </div>
                        <div className="skeleton h-20 w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            : (
                renderData && (
                  <div className="space-y-4">
                    {isSmall && tabButtons
                      ? (
                          <div className="space-y-3">
                            <div className="w-full min-w-0">
                              {tabButtons}
                            </div>
                            <div className="min-w-0">
                              <div>
                                {isDiceMaiden
                                  ? (
                                      <Section
                                        key="copywriting"
                                        className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
                                        collapsible={false}
                                      >
                                        <div className="flex justify-between items-center mb-4">
                                          <h3 className="card-title text-lg flex items-center gap-2 ml-1">
                                            ⚡
                                            骰娘文案配置
                                          </h3>
                                          <div className="flex items-center gap-2">
                                            {copywritingSaveMsg && (
                                              <span className="text-sm text-base-content/70">{copywritingSaveMsg}</span>
                                            )}
                                            {!isEditingControlled && (
                                              <button
                                                type="button"
                                                onClick={isCopywritingPreview ? () => setIsCopywritingPreview(false) : handleCopywritingSave}
                                                className={`btn ${isSmall ? "btn-xs" : "btn-sm"} ${
                                                  isCopywritingPreview ? "btn-accent" : "btn-primary"
                                                }`}
                                              >
                                                {isCopywritingPreview
                                                  ? (
                                                      <span className="flex items-center gap-1">
                                                        <EditIcon className="w-4 h-4" />
                                                        编辑
                                                      </span>
                                                    )
                                                  : (
                                                      <span className="flex items-center gap-1">
                                                        <SaveIcon className="w-4 h-4" />
                                                        保存
                                                      </span>
                                                    )}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        {showCopywritingPreview
                                          ? (
                                              <div className="space-y-4">
                                                {Object.keys(renderData.copywritingTemplates || {}).length === 0
                                                  ? (
                                                      <div className="text-base-content/60">暂无文案可预览</div>
                                                    )
                                                  : (
                                                      Object.entries(renderData.copywritingTemplates || {}).map(([group, items]) => (
                                                        <div key={group} className="collapse collapse-arrow bg-base-200 rounded-xl">
                                                          <input type="checkbox" defaultChecked />
                                                          <div className="collapse-title font-semibold">
                                                            {group}
                                                            <span className="badge badge-sm badge-primary ml-2">{items?.length || 0}</span>
                                                          </div>
                                                          <div className="collapse-content">
                                                            {(!items || items.length === 0)
                                                              ? (
                                                                  <div className="text-base-content/50 text-sm">该分组暂无文案</div>
                                                                )
                                                              : (
                                                                  <ul className="list bg-base-100 rounded-lg">
                                                                    {items.map((line, index) => (
                                                                      <li key={`${group}-${line.substring(0, 50)}-${line.length}`} className="list-row">
                                                                        <div className="text-xs font-mono opacity-50 tabular-nums">
                                                                          {String(index + 1).padStart(2, "0")}
                                                                        </div>
                                                                        <div className="text-sm whitespace-pre-wrap wrap-break-words">
                                                                          {line}
                                                                        </div>
                                                                      </li>
                                                                    ))}
                                                                  </ul>
                                                                )}
                                                          </div>
                                                        </div>
                                                      ))
                                                    )}
                                              </div>
                                            )
                                          : (
                                              <CopywritingEditor
                                                value={renderData.copywritingTemplates}
                                                onChange={handleCopywritingChange}
                                              />
                                            )}
                                      </Section>
                                    )
                                  : (
                                      renderActiveTabContent()
                                    )}
                              </div>
                            </div>
                          </div>
                        )
                      : (
                          <>
                            {tabButtons}
                            <div className="mt-2">
                              {isDiceMaiden
                                ? (
                                    <Section
                                      key="copywriting"
                                      className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
                                      collapsible={false}
                                    >
                                      <div className="flex justify-between items-center mb-4">
                                        <h3 className="card-title text-lg flex items-center gap-2 ml-1">
                                          ⚡
                                          骰娘文案配置
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          {copywritingSaveMsg && (
                                            <span className="text-sm text-base-content/70">{copywritingSaveMsg}</span>
                                          )}
                                          {!isEditingControlled && (
                                            <button
                                              type="button"
                                              onClick={isCopywritingPreview ? () => setIsCopywritingPreview(false) : handleCopywritingSave}
                                              className={`btn ${isSmall ? "btn-xs" : "btn-sm"} ${
                                                isCopywritingPreview ? "btn-accent" : "btn-primary"
                                              }`}
                                            >
                                              {isCopywritingPreview
                                                ? (
                                                    <span className="flex items-center gap-1">
                                                      <EditIcon className="w-4 h-4" />
                                                      编辑
                                                    </span>
                                                  )
                                                : (
                                                    <span className="flex items-center gap-1">
                                                      <SaveIcon className="w-4 h-4" />
                                                      保存
                                                    </span>
                                                  )}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {showCopywritingPreview
                                        ? (
                                            <div className="space-y-4">
                                              {Object.keys(renderData.copywritingTemplates || {}).length === 0
                                                ? (
                                                    <div className="text-base-content/60">暂无文案可预览</div>
                                                  )
                                                : (
                                                    Object.entries(renderData.copywritingTemplates || {}).map(([group, items]) => (
                                                      <div key={group} className="collapse collapse-arrow bg-base-200 rounded-xl">
                                                        <input type="checkbox" defaultChecked />
                                                        <div className="collapse-title font-semibold">
                                                          {group}
                                                          <span className="badge badge-sm badge-primary ml-2">{items?.length || 0}</span>
                                                        </div>
                                                        <div className="collapse-content">
                                                          {(!items || items.length === 0)
                                                            ? (
                                                                <div className="text-base-content/50 text-sm">该分组暂无文案</div>
                                                              )
                                                            : (
                                                                <ul className="list bg-base-100 rounded-lg">
                                                                  {items.map((line, index) => (
                                                                    <li key={`${group}-${line.substring(0, 50)}-${line.length}`} className="list-row">
                                                                      <div className="text-xs font-mono opacity-50 tabular-nums">
                                                                        {String(index + 1).padStart(2, "0")}
                                                                      </div>
                                                                      <div className="text-sm whitespace-pre-wrap wrap-break-words">
                                                                        {line}
                                                                      </div>
                                                                    </li>
                                                                  ))}
                                                                </ul>
                                                              )}
                                                        </div>
                                                      </div>
                                                    ))
                                                  )}
                                            </div>
                                          )
                                        : (
                                            <CopywritingEditor
                                              value={renderData.copywritingTemplates}
                                              onChange={handleCopywritingChange}
                                            />
                                          )}
                                    </Section>
                                  )
                                : (
                                    renderActiveTabContent()
                                  )}
                            </div>
                          </>
                        )}
                  </div>
                )
              )}
      </div>

      {/* ST指令弹窗 */}
      {isStImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onStImportModalClose}>
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">ST指令</h3>
                <button
                  type="button"
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={onStImportModalClose}
                >
                  <CloseIcon className="w-4 h-4" />
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
