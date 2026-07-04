import { useMemo, useState } from "react";

import { ChevronRightIcon } from "@/icons";

import type { RoleConfigTabKey } from "./configTabMeta";

import Section from "../Editors/Section";
import { getRoleConfigTabItem } from "./configTabMeta";
import NumericalEditor from "./NumericalEditor";

type ConfigurationSectionProps = {
  title?: string;
  roleId: number;
  ruleId: number;
  fieldType: "basic" | "ability" | "skill";
  configKey: RoleConfigTabKey;
  customLabel: string; // e.g., "基础属性", "能力", "技能"
  hideExternalTitlesOnMobile?: boolean;
  // 数据源
  abilityData: Record<string, any>;
  ruleData: Record<string, any>;
  localEdits: Record<string, any>;
  // 更新回调
  onDataChange: (newData: Record<string, any>) => void;
}

// 分离数据的工具函数
function separateDataByTemplate(
  currentData: Record<string, any>,
  templateData: Record<string, any>,
): { modified: Record<string, any>; template: Record<string, any> } {
  const modified: Record<string, any> = {};
  const template: Record<string, any> = {};

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
        // 修改过的数据（包括新添加的字段和值被修改的字段）
        modified[key] = stringValue;
      }
    });

    // 不自动添加模版中存在但当前数据中不存在的项
    // 这样可以避免重命名字段后原字段名重新出现的问题
  }
  else {
    // 如果没有当前数据，所有都是模版数据
    Object.entries(templateData).forEach(([key, value]) => {
      template[key] = String(value || "");
    });
  }

  return { modified, template };
}

export function ConfigurationSection({
  title,
  roleId,
  ruleId,
  fieldType,
  configKey,
  customLabel,
  hideExternalTitlesOnMobile = false,
  abilityData,
  ruleData,
  localEdits,
  onDataChange,
}: ConfigurationSectionProps) {
  const [isModifiedOpen, setIsModifiedOpen] = useState(true);
  const [isTemplateOpen, setIsTemplateOpen] = useState(true);

  // 分离数据的逻辑
  const { modifiedData, templateData } = useMemo(() => {
    const currentData = localEdits || abilityData;
    const { modified, template } = separateDataByTemplate(currentData, ruleData);
    return { modifiedData: modified, templateData: template };
  }, [abilityData, ruleData, localEdits]);

  const allFieldKeys = useMemo(
    () => Array.from(new Set([...Object.keys(modifiedData), ...Object.keys(templateData)])),
    [modifiedData, templateData],
  );

  // 通用的数据合并和更新函数
  const handleDataChange = (
    newData: Record<string, any>,
    mergeWith?: Record<string, any>,
  ) => {
    const finalData = mergeWith ? { ...mergeWith, ...newData } : newData;
    onDataChange(finalData);
  };

  // 处理规则模版区域的变更
  const handleTemplateChange = (newData: Record<string, any>) => {
    // 直接将模版区域的变更合并到修改数据中
    // 因为任何在模版区域的编辑都应该被视为自定义修改
    const updatedData = { ...modifiedData, ...newData };
    onDataChange(updatedData);
  };

  // 处理自定义区域的变更
  const handleModifiedChange = (newData: Record<string, any>) => {
    handleDataChange(newData, templateData);
  };

  const modifiedCount = Object.keys(modifiedData).length;
  const templateCount = Object.keys(templateData).length;

  const sectionHeaderClassName = hideExternalTitlesOnMobile
    ? "hidden md:flex"
    : "flex";
  const { Icon } = getRoleConfigTabItem(configKey);

  const renderSectionHeader = ({
    badgeClassName,
    count,
    isOpen,
    labelPrefix,
    onToggle,
  }: {
    badgeClassName: string;
    count: number;
    isOpen: boolean;
    labelPrefix: string;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className={`
        ${sectionHeaderClassName}
        group w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left
        transition-colors hover:bg-base-content/5
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/25
      `}
      title={isOpen ? "收起" : "展开"}
    >
      <ChevronRightIcon
        className={`
          size-4 shrink-0 text-base-content/45 transition-transform
          group-hover:text-info
          ${isOpen ? "rotate-90" : ""}
        `}
        aria-hidden="true"
      />
      <Icon className="size-5 shrink-0 text-base-content/80" weight="regular" aria-hidden="true" />
      <span className="text-lg font-semibold">
        {labelPrefix}
        {customLabel}
      </span>
      <div className={badgeClassName}>{count}</div>
    </button>
  );

  return (
    <Section
      title={title}
      className="
        rounded-2xl
        md:border-2 md:border-base-content/10
        bg-base-100
      "
      collapsible={false}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          {renderSectionHeader({
            badgeClassName: "badge badge-success badge-sm min-w-6",
            count: modifiedCount,
            isOpen: isModifiedOpen,
            labelPrefix: "已自定义的",
            onToggle: () => setIsModifiedOpen(isOpen => !isOpen),
          })}

          {isModifiedOpen && (
            <NumericalEditor
              data={modifiedData}
              onChange={handleModifiedChange}
              roleId={roleId}
              ruleId={ruleId}
              fieldType={fieldType}
              hideTitle
              hideTitleOnMobile
              existingKeys={allFieldKeys}
              allowAddField
            />
          )}
        </div>

        {templateCount > 0 && (
          <div className="space-y-4">
            {renderSectionHeader({
              badgeClassName: "badge badge-info badge-sm",
              count: templateCount,
              isOpen: isTemplateOpen,
              labelPrefix: "规则模版",
              onToggle: () => setIsTemplateOpen(isOpen => !isOpen),
            })}

            {isTemplateOpen && (
              <NumericalEditor
                data={templateData}
                onChange={handleTemplateChange}
                roleId={roleId}
                ruleId={ruleId}
                fieldType={fieldType}
                hideTitle
                hideTitleOnMobile
                existingKeys={allFieldKeys}
                allowAddField={false}
              />
            )}
          </div>
        )}

      </div>
    </Section>
  );
}
