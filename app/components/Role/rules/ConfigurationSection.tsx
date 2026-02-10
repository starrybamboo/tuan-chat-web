import { useMemo } from "react";
import { CollapsibleAlert } from "@/components/common/CollapsibleAlert";
import Section from "../Editors/Section";
import NumericalEditor from "./NumericalEditor";

interface ConfigurationSectionProps {
  title?: string;
  roleId: number;
  ruleId: number;
  isEditing?: boolean;
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

// 能力可视化：从数据里抽取 hp / mp / san
function extractHpMpSan(data: Record<string, any>) {
  const entries = Object.entries(data || {});
  const findKey = (candidates: string[]) =>
    entries.find(([k]) => candidates.includes(k.toLowerCase()));

  const hpEntry = findKey(["hp", "health", "生命"]);
  const mpEntry = findKey(["mp", "mana", "魔法"]);
  const sanEntry = findKey(["san", "sanity", "理智"]);

  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    hpKey: hpEntry?.[0],
    hpValue: hpEntry ? toNum(hpEntry[1]) : undefined,
    mpKey: mpEntry?.[0],
    mpValue: mpEntry ? toNum(mpEntry[1]) : undefined,
    sanKey: sanEntry?.[0],
    sanValue: sanEntry ? toNum(sanEntry[1]) : undefined,
  };
}

// 映射到 0~100，便于进度条宽度
function toPercent(value?: number, max = 100) {
  if (value == null)
    return 0;
  if (!Number.isFinite(value) || max <= 0)
    return 0;
  const v = Math.max(0, Math.min(value, max));
  return (v / max) * 100;
}

export function ConfigurationSection({
  title,
  roleId,
  ruleId,
  isEditing,
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

  // 能力配置可视化数据
  const modifiedAbilityVisual = useMemo(
    () => extractHpMpSan(modifiedData),
    [modifiedData],
  );
  const templateAbilityVisual = useMemo(
    () => extractHpMpSan(templateData),
    [templateData],
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
  const hasNoData = modifiedCount === 0 && templateCount === 0;

  return (
    <Section
      title={title}
      className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
      collapsible={false}
    >
      <div className="space-y-6">
        {(modifiedCount > 0 || hasNoData) && (
          <div className="space-y-4">
            {modifiedCount > 0
              ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold">
                        ⚡已自定义的
                        {customLabel}
                      </h4>
                      <div className="badge badge-success badge-sm">{modifiedCount}</div>
                    </div>

                    {/* 能力配置 */}
                    {fieldType === "ability" && (
                      (modifiedAbilityVisual.hpValue != null
                        || modifiedAbilityVisual.mpValue != null
                        || modifiedAbilityVisual.sanValue != null) && (
                        <div className="space-y-2">
                          {modifiedAbilityVisual.hpValue != null && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{modifiedAbilityVisual.hpKey || "HP"}</span>
                                <span>{modifiedAbilityVisual.hpValue}</span>
                              </div>
                              <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-error"
                                  style={{
                                    width: `${toPercent(modifiedAbilityVisual.hpValue, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {modifiedAbilityVisual.mpValue != null && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{modifiedAbilityVisual.mpKey || "MP"}</span>
                                <span>{modifiedAbilityVisual.mpValue}</span>
                              </div>
                              <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${toPercent(modifiedAbilityVisual.mpValue, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {modifiedAbilityVisual.sanValue != null && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>{modifiedAbilityVisual.sanKey || "SAN"}</span>
                                <span>{modifiedAbilityVisual.sanValue}</span>
                              </div>
                              <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500"
                                  style={{
                                    width: `${toPercent(modifiedAbilityVisual.sanValue, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}

                    <CollapsibleAlert
                      type="success"
                      message="这些{label}已经过自定义修改，不同于规则模版"
                      replacements={{ label: customLabel }}
                    />
                  </>
                )
              : (
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
                )}

            <NumericalEditor
              data={modifiedCount > 0 ? modifiedData : {}}
              onChange={handleModifiedChange}
              roleId={roleId}
              ruleId={ruleId}
              isEditing={isEditing}
              title={modifiedCount > 0 ? `自定义${customLabel}` : `添加${customLabel}`}
              fieldType={fieldType}
            />
          </div>
        )}

        {/* 规则模版数据区域：去掉折叠按钮，直接展示 */}
        {templateCount > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold">
                ⚡规则模版
                {customLabel}
              </h4>
              <div className="badge badge-info badge-sm">{templateCount}</div>
            </div>

            {/* 能力配置：模板 HP / MP / SAN 可视化 */}
            {fieldType === "ability" && (
              (templateAbilityVisual.hpValue != null
                || templateAbilityVisual.mpValue != null
                || templateAbilityVisual.sanValue != null) && (
                <div className="bg-base-100 rounded-xl p-4 shadow-sm space-y-2">
                  <h5 className="font-semibold text-sm">模板能力可视化</h5>
                  {templateAbilityVisual.hpValue != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{templateAbilityVisual.hpKey || "HP"}</span>
                        <span>{templateAbilityVisual.hpValue}</span>
                      </div>
                      <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-error"
                          style={{
                            width: `${toPercent(templateAbilityVisual.hpValue, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {templateAbilityVisual.mpValue != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{templateAbilityVisual.mpKey || "MP"}</span>
                        <span>{templateAbilityVisual.mpValue}</span>
                      </div>
                      <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${toPercent(templateAbilityVisual.mpValue, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {templateAbilityVisual.sanValue != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{templateAbilityVisual.sanKey || "SAN"}</span>
                        <span>{templateAbilityVisual.sanValue}</span>
                      </div>
                      <div className="h-3 w-full bg-base-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${toPercent(templateAbilityVisual.sanValue, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            <CollapsibleAlert
              type="info"
              message="这些{label}使用规则模版的默认值，编辑后将移动到上方的自定义区域"
              replacements={{ label: customLabel }}
            />

            <NumericalEditor
              data={templateData}
              onChange={handleTemplateChange}
              roleId={roleId}
              ruleId={ruleId}
              isEditing={isEditing}
              title={`模版${customLabel}`}
              fieldType={fieldType}
            />
          </div>
        )}

      </div>
    </Section>
  );
}
