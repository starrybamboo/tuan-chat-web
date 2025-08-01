import { useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useEffect, useMemo, useState } from "react";
import { FormulaParser } from "./FormulaParser";
import { flattenConstraints } from "./ObjectExpansion";

// 定义公式值的类型
interface FormulaValue {
  formula: string;
  displayValue: number;
}

// 扩展 NumericalConstraints 类型
interface ExtendedNumericalConstraints {
  [key: string]: {
    [key: string]: string | number | FormulaValue;
  };
}

interface NumericalEditorProps {
  constraints: ExtendedNumericalConstraints;
  onChange: (constraints: ExtendedNumericalConstraints) => void;
  abilityId: number;
}

/**
 * 数值编辑器组件
 * 负责管理角色数值相关的字段，支持公式计算和约束组
 * 以两列布局展示数值字段，提供添加、编辑和删除功能
 */
export default function NumericalEditor({
  constraints,
  onChange,
  abilityId,
}: NumericalEditorProps) {
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localConstraints, setLocalConstraints] = useState(constraints);

  // 负数与非法输入修正（包括小数的情况）
  const correctValues = (constraints: ExtendedNumericalConstraints): ExtendedNumericalConstraints => {
    const corrected = { ...constraints };
    Object.keys(corrected).forEach((totalKey) => {
      const fields = corrected[totalKey];
      Object.keys(fields).forEach((fieldKey) => {
        const value = fields[fieldKey];
        if (typeof value === "object" && "formula" in value) {
          return; // 跳过公式值
        }
        const num = Number(value);
        // 只允许整数，不允许小数
        if (Number.isNaN(num) || num < 0 || !Number.isInteger(num)) {
          fields[fieldKey] = 0;
        }
      });
    });
    return corrected;
  };

  // 当外部 constraints 改变时更新本地状态
  useEffect(() => {
    setLocalConstraints(constraints);
  }, [constraints]);

  // 将 constraints 转换为数组格式用于渲染
  const constraintGroups = useMemo(() => {
    return Object.entries(localConstraints).map(([totalKey, fields]) => ({
      totalKey,
      fields,
    }));
  }, [localConstraints]);

  // 获取所有上下文数据
  const getAllContext = (constraints: ExtendedNumericalConstraints): Record<string, number> => {
    const context: Record<string, number> = {};

    // 处理静态字段（非0的约束组）
    const staticFields = Object.entries(constraints)
      .filter(([key]) => key !== "0")
      .reduce((acc, [_, fields]) => ({ ...acc, ...fields }), {});

    // 添加静态字段到上下文
    Object.entries(staticFields).forEach(([key, value]) => {
      if (typeof value === "string" && value.startsWith("=")) {
        return;
      }
      if (typeof value === "object" && value !== null && "displayValue" in value) {
        const formulaValue = value as FormulaValue;
        context[key] = formulaValue.displayValue;
        return;
      }
      const num = Number(value);
      context[key] = Number.isNaN(num) ? 0 : num;
    });

    return context;
  };

  // 计算所有公式的值
  const calculateFormulas = (constraints: ExtendedNumericalConstraints, context: Record<string, number>) => {
    const updatedConstraints = { ...constraints };
    Object.keys(updatedConstraints).forEach((totalKey) => {
      const fields = updatedConstraints[totalKey];
      Object.keys(fields).forEach((fieldKey) => {
        const value = fields[fieldKey];
        if (typeof value === "string" && value.startsWith("=")) {
          const evaluatedValue = FormulaParser.evaluate(value, context);
          fields[fieldKey] = {
            formula: value,
            displayValue: evaluatedValue,
          };
        }
      });
    });
    return updatedConstraints;
  };

  // 实时计算约束值
  const calculatedConstraints = useMemo(() => {
    const allContext = getAllContext(localConstraints);
    return calculateFormulas(localConstraints, allContext);
  }, [localConstraints]);

  // 处理字段值更新
  const handleExitEditing = () => {
    setIsTransitioning(true);
    // 获取扁平化的约束数据
    const flattenedConstraints = flattenConstraints(localConstraints);

    // 计算所有公式并更新值
    const allContext = getAllContext(localConstraints);
    const updatedConstraints = calculateFormulas(localConstraints, allContext);

    // 修正负数和非法输入
    const correctedConstraints = correctValues(updatedConstraints);

    // 更新前端状态
    setLocalConstraints(correctedConstraints);
    onChange(correctedConstraints);

    // 更新后端数据
    const updatedAbility = {
      abilityId,
      ability: flattenedConstraints,
    };
    updateFiledAbility(updatedAbility, {
      onSuccess: () => {
        setTimeout(() => {
          setIsEditing(false);
          setIsTransitioning(false);
        }, 300);
      },
      onError: () => {
        setIsTransitioning(false);
      },
    });
  };

  // 处理字段值更新
  const handleFieldUpdate = (totalKey: string, fieldKey: string, newValue: string) => {
    const fields = localConstraints[totalKey];
    const currentValue = fields[fieldKey];

    // 如果是公式字段，不允许修改
    if (typeof currentValue === "object" && "formula" in currentValue) {
      return;
    }

    // 非公式字段直接更新
    const updatedConstraints = {
      ...localConstraints,
      [totalKey]: {
        ...fields,
        [fieldKey]: newValue,
      },
    };

    setLocalConstraints(updatedConstraints);
  };
  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 duration-300 transition-opacity ${
      isTransitioning ? "opacity-50" : ""
    } ${
      isEditing ? "ring-2 ring-primary" : ""
    }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">数值约束</h3>
        <button
          type="button"
          onClick={isEditing ? handleExitEditing : () => setIsEditing(true)}
          className={`btn btn-sm ${
            isEditing ? "btn-primary" : "btn-accent"
          } ${
            isTransitioning ? "scale-95" : ""
          }`}
          disabled={isTransitioning}
        >
          {isTransitioning
            ? (
                <span className="loading loading-spinner loading-xs"></span>
              )
            : isEditing
              ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    保存
                  </span>
                )
              : (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    编辑
                  </span>
                )}
        </button>
      </div>

      {constraintGroups.map(({ totalKey, fields }) => {
        if (!totalKey)
          return null;

        const entries = Object.entries(fields);

        const totalPoints = Number(totalKey);
        const currentSum = Object.values(fields).reduce((sum: number, value) => {
          if (typeof value === "object" && "displayValue" in value) {
            return sum + (Number.isNaN(value.displayValue) ? 0 : value.displayValue);
          }
          const parsed = typeof value === "string" ? FormulaParser.parse(value) : Number(value);
          const numericValue = Number(parsed);
          return Number.isNaN(numericValue) ? sum : sum + numericValue;
        }, 0);

        const remainPoints = totalPoints - currentSum;

        return (
          <div
            key={totalKey}
            className={`bg-base-200 p-1 md:p-4 rounded-lg ${
              isEditing ? "bg-base-100" : ""
            }`}
          >
            <div className="flex items-center mb-4">
              <h3 className="font-bold">
                {totalKey === "0" ? "动态约束组" : `总点数: ${totalPoints}`}
              </h3>
              <span
                className={`font-semibold ${
                  remainPoints < 0 ? "text-error font-bold pl-8" : "text-success pl-8"
                }`}
              >
                {totalKey !== "0"
                  ? remainPoints >= 0
                    ? `剩余点数: ${remainPoints}`
                    : `超出点数: ${-remainPoints}`
                  : null}
              </span>
            </div>

            {/* 网格布局 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-6">
              {entries.map(([key]) => {
                const calculatedValue = calculatedConstraints[totalKey][key];
                if (totalKey === "0") {
                  return (
                    <div key={key} className="flex flex-col gap-1 mb-2">
                      <div className="card bg-base-100 shadow-sm p-2 h-full">
                        <div className="text-sm font-medium mb-1">{key}</div>
                        <div className="text-base-content mt-0.5">
                          {typeof calculatedValue === "object" && "displayValue" in calculatedValue
                            ? calculatedValue.displayValue.toString()
                            : typeof calculatedValue === "string" ? calculatedValue : calculatedValue.toString()}
                        </div>
                        {typeof calculatedValue === "object" && "formula" in calculatedValue && (
                          <div className="text-xs text-gray-500 mt-1">
                            {calculatedValue.formula}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                else {
                  return (
                    <div key={key} className="flex flex-col gap-1 mb-2">
                      {isEditing
                        ? (
                            <div className="flex items-center gap-1 group">
                              <div className="hidden md:block w-full">
                                <label className="input flex items-center gap-1 md:gap-2 w-full">
                                  <span className="text-xs md:text-sm">{key}</span>
                                  <div className="w-px h-4 bg-base-content/20"></div>
                                  <input
                                    type="text"
                                    value={typeof calculatedValue === "object" && "displayValue" in calculatedValue
                                      ? calculatedValue.displayValue.toString()
                                      : typeof calculatedValue === "string" ? calculatedValue : calculatedValue.toString()}
                                    className="grow"
                                    disabled={!isEditing}
                                    onChange={e => handleFieldUpdate(totalKey, key, e.target.value)}
                                  />
                                </label>
                              </div>
                              <div className="block md:hidden w-full">
                                <fieldset className="fieldset">
                                  <legend className="fieldset-legend text-xs">{key}</legend>
                                  <input
                                    type="text"
                                    value={typeof calculatedValue === "object" && "displayValue" in calculatedValue
                                      ? calculatedValue.displayValue.toString()
                                      : typeof calculatedValue === "string" ? calculatedValue : calculatedValue.toString()}
                                    className="input w-full"
                                    disabled={!isEditing}
                                    onChange={e => handleFieldUpdate(totalKey, key, e.target.value)}
                                  />
                                </fieldset>
                              </div>
                            </div>
                          )
                        : (
                            <div className="card bg-base-100 shadow-sm p-2 h-full">
                              <div className="flex items-center gap-0 md:gap-2">
                                <div className="p-1 text-xs md:text-base md:p-2">
                                  {key}
                                </div>
                                <div className="divider divider-horizontal ml-0 mr-0 md:mr-2" />
                                <div className="text-base-content text-xs md:text-base p-1 md:p-0">
                                  <span>
                                    {typeof calculatedValue === "object" && "displayValue" in calculatedValue
                                      ? calculatedValue.displayValue.toString()
                                      : typeof calculatedValue === "string" ? calculatedValue : calculatedValue.toString()}
                                  </span>
                                </div>
                              </div>
                              {typeof calculatedValue === "object" && "formula" in calculatedValue && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {calculatedValue.formula}
                                </div>
                              )}
                            </div>
                          )}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
