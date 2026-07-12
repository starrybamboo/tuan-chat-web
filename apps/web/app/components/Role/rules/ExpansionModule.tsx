import { DownloadSimpleIcon, MaskHappyIcon, SparkleIcon } from "@phosphor-icons/react";
import { useAbilityByRuleAndRole, useSetRoleAbilityMutation, useUpdateRoleAbilityByRoleIdMutation } from "api/hooks/abilityQueryHooks";
import { useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
import { DialogFrame } from "@/components/common/DialogFrame";
import { Skeleton } from "@/components/common/StatusPrimitives";
import { panelSwapMotionProps } from "@/components/common/motion/listItemMotion";
import ImportWithStCmd from "@/components/Role/rules/ImportWithStCmd";
import { WrenchIcon } from "@/icons";

import type { RoleConfigTabKey } from "./configTabMeta";

import CopywritingEditor from "../Editors/CopywritingEditor";
import Section from "../Editors/Section";
import { ROLE_CONFIG_TAB_ITEMS } from "./configTabMeta";
import { ConfigurationSection } from "./ConfigurationSection";
import NumericalEditorSmall from "./NumericalEditorSmall";
import PerformanceEditor from "./PerformanceEditor";
import PerformanceEditorSmall from "./PerformanceEditorSmall";

const COPYWRITING_AUTOSAVE_DELAY_MS = 800;

type ExpansionModuleProps = {
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
  roleId,
  ruleId,
  onLoadingChange, // 1. 在 props 中解构出 onLoadingChange
  isStImportModalOpen = false,
  onStImportModalClose,
  onOpenStImportModal,
  onOpenAIGenerateModal,
  size = "default",
}: ExpansionModuleProps) {
  // ״̬
  const selectedRuleId = ruleId ?? 1;

  // 角色类型查询（用于条件渲染Tab）
  const roleQuery = useGetRoleQuery(roleId);
  const isDiceMaiden = roleQuery.data?.data?.type === 1;

  // 当前选中的Tab，依据角色类型设置默认
  const [activeTab, setActiveTab] = useState<RoleConfigTabKey>("basic");
  const isSmall = size === "small";
  // 移动端快捷工具菜单使用受控状态，便于统一外部点击与 Esc 关闭行为。
  // 这里仅观测焦点以同步 aria-expanded，不改变原有焦点行为。
  const [isQuickToolsOpen, setIsQuickToolsOpen] = useState(false);

  // API Hooks
  const abilityQuery = useAbilityByRuleAndRole(roleId, selectedRuleId || 0);
  const ruleDetailQuery = useRuleDetailQuery(selectedRuleId || 0);
  const setRoleAbilityMutation = useSetRoleAbilityMutation();
  const { mutate: updateFieldAbility } = useUpdateRoleAbilityByRoleIdMutation();
  const [copywritingSaveMsg, setCopywritingSaveMsg] = useState<string>("");
  const copywritingAutosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copywritingStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copywritingSaveVersionRef = useRef(0);
  const lastSavedCopywritingRef = useRef<string>("");

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
    queueMicrotask(() => setLocalEdits({}));
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

  const baseCopywritingSerialized = useMemo(
    () => JSON.stringify(abilityQuery.data?.extraCopywriting ?? {}),
    [abilityQuery.data?.extraCopywriting],
  );

  useEffect(() => {
    if (localEdits.copywritingTemplates !== undefined) {
      return;
    }
    lastSavedCopywritingRef.current = baseCopywritingSerialized;
  }, [baseCopywritingSerialized, localEdits.copywritingTemplates]);

  // 保存骰娘文案到 ability.extra.copywriting（序列化为字符串）
  const saveCopywritingTemplates = useCallback((serializedData: string) => {
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
    const saveVersion = copywritingSaveVersionRef.current + 1;
    copywritingSaveVersionRef.current = saveVersion;
    if (copywritingStatusTimerRef.current) {
      clearTimeout(copywritingStatusTimerRef.current);
      copywritingStatusTimerRef.current = null;
    }
    setCopywritingSaveMsg("保存中...");

    updateFieldAbility(payload, {
      onSuccess: () => {
        if (copywritingSaveVersionRef.current !== saveVersion) {
          return;
        }
        lastSavedCopywritingRef.current = serializedData;
        // 只有当前本地值与本次保存完全一致时才清空，避免旧响应覆盖连续输入。
        setLocalEdits((prev) => {
          if (prev.copywritingTemplates === undefined) {
            return prev;
          }
          if (JSON.stringify(prev.copywritingTemplates) !== serializedData) {
            return prev;
          }
          return { ...prev, copywritingTemplates: undefined };
        });
        setCopywritingSaveMsg("已自动保存");
        copywritingStatusTimerRef.current = setTimeout(() => {
          setCopywritingSaveMsg(prev => (prev === "已自动保存" ? "" : prev));
          copywritingStatusTimerRef.current = null;
        }, 1500);
      },
      onError: (e: any) => {
        if (copywritingSaveVersionRef.current !== saveVersion) {
          return;
        }
        console.error("保存骰娘文案失败:", e);
        console.error("错误详情:", e?.body || e?.message || e);
        setCopywritingSaveMsg(`保存失败: ${e?.body?.message || e?.message || "请稍后重试"}`);
        copywritingStatusTimerRef.current = setTimeout(() => {
          setCopywritingSaveMsg("");
          copywritingStatusTimerRef.current = null;
        }, 3000);
      },
    });
  }, [roleId, selectedRuleId, updateFieldAbility]);

  useEffect(() => {
    const copywritingData = localEdits.copywritingTemplates;
    if (copywritingData === undefined) {
      return;
    }
    const serializedData = JSON.stringify(copywritingData);
    if (serializedData === lastSavedCopywritingRef.current) {
      return;
    }
    if (copywritingAutosaveTimerRef.current) {
      clearTimeout(copywritingAutosaveTimerRef.current);
    }
    copywritingAutosaveTimerRef.current = setTimeout(() => {
      saveCopywritingTemplates(serializedData);
      copywritingAutosaveTimerRef.current = null;
    }, COPYWRITING_AUTOSAVE_DELAY_MS);

    return () => {
      if (copywritingAutosaveTimerRef.current) {
        clearTimeout(copywritingAutosaveTimerRef.current);
        copywritingAutosaveTimerRef.current = null;
      }
    };
  }, [localEdits.copywritingTemplates, saveCopywritingTemplates]);

  useEffect(() => {
    return () => {
      if (copywritingAutosaveTimerRef.current) {
        clearTimeout(copywritingAutosaveTimerRef.current);
      }
      if (copywritingStatusTimerRef.current) {
        clearTimeout(copywritingStatusTimerRef.current);
      }
    };
  }, []);

  // 检查是否规则未创建
  const isRuleNotCreated = !abilityQuery.isLoading && !abilityQuery.isFetching && !abilityQuery.data && ruleDetailQuery.data;

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

  // 后台刷新时继续展示当前缓存，避免字段保存后整块切回骨架屏。
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
              fieldType="basic"
              configKey="basic"
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
              fieldType="ability"
              configKey="ability"
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
              fieldType="skill"
              configKey="skill"
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
            icon={<MaskHappyIcon className="
              size-5 shrink-0 text-base-content/80
            " weight="regular" aria-hidden="true" />}
            className="
              rounded-2xl
              md:border-2 md:border-base-content/10
              bg-base-100
            "
            collapsible={false}
            hideTitleOnMobile
          >
            <PerformanceEditor
              fields={renderData.actTemplate}
              onChange={handleActTemplateChange}
              abilityData={renderData.actTemplate}
              roleId={roleId}
              ruleId={selectedRuleId}
              hideTitleOnMobile
            />
          </Section>
        );
  };

  const renderAnimatedActiveTabContent = () => (
    <AnimatePresence initial={false} mode="wait">
      <motion.div key={activeTab} {...panelSwapMotionProps}>
        {renderActiveTabContent()}
      </motion.div>
    </AnimatePresence>
  );

  const hasQuickTools = Boolean(onOpenStImportModal || onOpenAIGenerateModal);
  const hasDesktopQuickTools = hasQuickTools && !isSmall;
  const desktopConfigButtonClass = "md:h-10 md:min-h-10 md:px-4 md:text-sm md:font-medium";
  const desktopQuickToolButtonClass = `
    h-10 min-h-10 rounded-lg border border-base-content/10
    bg-base-100/70 px-4 text-sm font-medium text-base-content/80 shadow-none
    transition-colors
    hover:border-info/40 hover:bg-info/10 hover:text-info
  `;

  const tabButtons = !isDiceMaiden
    ? (
        <div className={`
          flex min-w-0 items-center gap-1
          md:gap-2
          rounded-lg
          ${isSmall ? `w-full` : ""}
        `}>
          <div
            className={`
            flex min-w-0 flex-1 flex-nowrap gap-1
            md:flex-nowrap md:justify-start md:gap-3
            ${isSmall ? "" : ""}
          `}
            aria-label="角色配置"
            role="tablist"
          >
            {ROLE_CONFIG_TAB_ITEMS.map(({ key, label, shortLabel, Icon }) => (
              <Button
                key={key}
                type="button"
                variant={activeTab === key ? "outline" : "ghost"}
                size={isSmall ? "sm" : "md"}
                aria-selected={activeTab === key}
                role="tab"
                className={`
                  h-10 min-h-10 flex-none px-3 text-sm whitespace-nowrap
                  rounded-lg
                  ${activeTab === key ? "border-info/45 text-info hover:border-info/70 hover:bg-info/10" : ""}
                  ${isSmall ? "" : desktopConfigButtonClass}
                `}
                onClick={() => setActiveTab(key)}
              >
                <Icon className="size-4 shrink-0" weight="regular" aria-hidden="true" />
                <span className="md:hidden">{shortLabel}</span>
                <span className="
                  hidden
                  md:inline
                ">{label}</span>
              </Button>
            ))}
          </div>
          {hasDesktopQuickTools && (
            <div className="
              hidden shrink-0 items-center gap-2
              md:flex
            ">
              {onOpenStImportModal && (
                <button
                  type="button"
                  onClick={onOpenStImportModal}
                  className={`
                    ${desktopQuickToolButtonClass}
                    inline-flex items-center gap-2
                  `}
                >
                  <DownloadSimpleIcon className="size-4" weight="regular" aria-hidden="true" />
                  ST导入
                </button>
              )}
              {onOpenAIGenerateModal && (
                <button
                  type="button"
                  onClick={onOpenAIGenerateModal}
                  className={`
                    ${desktopQuickToolButtonClass}
                    inline-flex items-center gap-2
                  `}
                >
                  <SparkleIcon className="size-4" weight="fill" aria-hidden="true" />
                  AI生成
                </button>
              )}
            </div>
          )}
          {hasQuickTools && (
            <DropdownMenu
              ariaLabel="导入和生成功能"
              placement={isSmall ? "bottom-start" : "bottom-end"}
              open={isQuickToolsOpen}
              onOpenChange={setIsQuickToolsOpen}
              className="md:hidden"
              menuClassName="z-20 w-32 border-base-content/10 p-2 shadow-lg"
              trigger={(
                <Button
                  size={isSmall ? "sm" : "md"}
                  shape="circle"
                  className="size-10 min-h-10 rounded-full md:size-12 md:min-h-12"
                  aria-label="打开导入和生成功能"
                >
                  <WrenchIcon className="size-5" aria-hidden="true" />
                </Button>
              )}
            >
                {onOpenStImportModal && (
                  <li role="none">
                    <MenuItem onClick={onOpenStImportModal}>
                      ST导入
                    </MenuItem>
                  </li>
                )}
                {onOpenAIGenerateModal && (
                  <li role="none">
                    <MenuItem onClick={onOpenAIGenerateModal}>
                      AI生成
                    </MenuItem>
                  </li>
                )}
            </DropdownMenu>
          )}
        </div>
      )
    : null;

  return (
    <>
      <div key={`expansion-module-${roleId}-${selectedRuleId}`} className={isSmall ? `
        space-y-3
      ` : `space-y-4`}>
        {/* 规则未创建状态 */}
        {isRuleNotCreated
          ? (
              <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 shadow-xs" })}>
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold mb-2">规则尚未创建</h3>
                  <p className="text-base-content/70 mb-6">
                    该角色还未配置此规则系统,点击下方按钮开始创建
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleCreateRule}
                  >
                    创建规则配置
                  </Button>
                </div>
              </div>
            )
          : isLoading
            ? (
                <div className="space-y-6">
                  {/* 骨架屏 - 模拟扩展模块 */}
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-20 rounded-lg" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                  </div>
                  <div className={surfaceClassName({ level: "content", className: "border-base-content/10 p-6 shadow-xs md:border-2" })}>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Skeleton className="h-6 w-32" />
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <Skeleton className="h-20 w-full" />
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
                                        className="
                                          rounded-2xl
                                          md:border-2 md:border-base-content/10
                                          bg-base-100
                                        "
                                        collapsible={false}
                                      >
                                        <div className="
                                          flex justify-between items-center mb-4
                                        ">
                                          <h3 className="ml-1 flex items-center gap-2 text-lg font-medium">
                                            <MaskHappyIcon className="
                                              size-5 shrink-0
                                              text-base-content/80
                                            " weight="regular" aria-hidden="true" />
                                            骰娘文案配置
                                          </h3>
                                          <div className="
                                            flex items-center gap-2
                                          ">
                                            {copywritingSaveMsg && (
                                              <span className="
                                                text-sm text-base-content/70
                                              ">{copywritingSaveMsg}</span>
                                            )}
                                          </div>
                                        </div>
                                        <CopywritingEditor
                                          value={renderData.copywritingTemplates}
                                          onChange={handleCopywritingChange}
                                        />
                                      </Section>
                                    )
                                  : (
                                      renderAnimatedActiveTabContent()
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
                                      className="
                                        rounded-2xl
                                        md:border-2 md:border-base-content/10
                                        bg-base-100
                                      "
                                      collapsible={false}
                                    >
                                      <div className="
                                        flex justify-between items-center mb-4
                                      ">
                                        <h3 className="ml-1 flex items-center gap-2 text-lg font-medium">
                                          <MaskHappyIcon className="
                                            size-5 shrink-0 text-base-content/80
                                          " weight="regular" aria-hidden="true" />
                                          骰娘文案配置
                                        </h3>
                                        <div className="flex items-center gap-2">
                                          {copywritingSaveMsg && (
                                            <span className="
                                              text-sm text-base-content/70
                                            ">{copywritingSaveMsg}</span>
                                          )}
                                        </div>
                                      </div>
                                      <CopywritingEditor
                                        value={renderData.copywritingTemplates}
                                        onChange={handleCopywritingChange}
                                      />
                                    </Section>
                                  )
                                : (
                                    renderAnimatedActiveTabContent()
                                  )}
                            </div>
                          </>
                        )}
                  </div>
                )
              )}
      </div>

      {/* ST指令弹窗 */}
      <DialogFrame
        open={isStImportModalOpen}
        mode="inline"
        onClose={() => onStImportModalClose?.()}
        ariaLabel="ST 指令"
        rootClassName="z-50 bg-black/50"
        panelClassName="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
      >
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold">ST指令</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <ImportWithStCmd
              roleId={roleId}
              ruleId={selectedRuleId}
              onImportSuccess={onStImportModalClose}
            />
          </div>
        </div>
      </DialogFrame>
    </>
  );
}
