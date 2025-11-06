import { useMemo } from "react";
import Section from "../Section";
import NumericalEditor from "./NumericalEditor";

interface ConfigurationSectionProps {
  title: string;
  roleId: number;
  ruleId: number;
  fieldType: "basic" | "ability" | "skill";
  customLabel: string; // e.g., "基础属性", "能力", "技能"
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
  customLabel,
  abilityData,
  ruleData,
  localEdits,
  onDataChange,
}: ConfigurationSectionProps) {
  // 分离数据的逻辑
  const { modifiedData, templateData } = useMemo(() => {
    const currentData = localEdits || abilityData;
    const { modified, template } = separateDataByTemplate(currentData, ruleData);
    return { modifiedData: modified, templateData: template };
  }, [abilityData, ruleData, localEdits]);

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
  const hasNoData = modifiedCount === 0 && templateCount === 0;

  return (
    <Section title={title} className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
      <div className="space-y-6">
        {/* 已修改的数据区域 */}
        {modifiedCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-success">
                已自定义的
                {customLabel}
              </h4>
              <div className="badge badge-success badge-sm">{modifiedCount}</div>
            </div>
            <div className="alert bg-success/40">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>
                这些
                {customLabel}
                已经过自定义修改，不同于规则模版
              </span>
            </div>
            <NumericalEditor
              data={modifiedData}
              onChange={handleModifiedChange}
              roleId={roleId}
              ruleId={ruleId}
              title={`自定义${customLabel}`}
              fieldType={fieldType}
            />
          </div>
        )}

        {/* 规则模版数据区域 - 可折叠 */}
        {templateCount > 0 && (
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" className="peer" />
            <div className="collapse-title text-lg font-medium flex items-center gap-2">
              <span>
                规则模版
                {customLabel}
              </span>
              <div className="badge badge-neutral badge-sm">{templateCount}</div>
              <div className="text-sm text-base-content/60 ml-auto">
                点击展开查看规则模版中的
                {customLabel}
              </div>
            </div>
            <div className="collapse-content">
              <div className="pt-4 space-y-4">
                <div className="alert bg-info/40">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>
                    这些
                    {customLabel}
                    使用规则模版的默认值，编辑后将移动到上方的自定义区域
                  </span>
                </div>
                <NumericalEditor
                  data={templateData}
                  onChange={handleTemplateChange}
                  roleId={roleId}
                  ruleId={ruleId}
                  title={`模版${customLabel}`}
                  fieldType={fieldType}
                />
              </div>
            </div>
          </div>
        )}

        {/* 当没有任何数据时的提示和添加入口 */}
        {hasNoData && (
          <>
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
              <span>
                当前规则没有配置任何
                {customLabel}
                ，可以通过添加字段来创建
                {customLabel}
              </span>
            </div>
            <NumericalEditor
              data={{}}
              onChange={handleModifiedChange}
              roleId={roleId}
              ruleId={ruleId}
              title={`添加${customLabel}`}
              fieldType={fieldType}
            />
          </>
        )}
      </div>
    </Section>
  );
}
