import { useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useEffect, useMemo, useState } from "react";
import FormulaParser from "./FormulaParser";
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

// 输入状态类型
interface InputState {
  key: string;
  value: string;
}

type InputStates = Record<string, InputState>;

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
  const [newTotal, setNewTotal] = useState("");
  const [isEditing, setIsEditing] = useState(false);
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

  // 管理每个约束组的输入状态
  const [inputStates, setInputStates] = useState<InputStates>(() =>
    Object.keys(localConstraints).reduce((acc, key) => {
      acc[key] = { key: "", value: "" };
      return acc;
    }, {} as InputStates),
  );

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

    // 添加动态字段到上下文
    const dynamicFields = constraints["0"] || {};
    Object.entries(dynamicFields).forEach(([key, value]) => {
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

  const handleExitEditing = () => {
    setIsEditing(false);

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
    updateFiledAbility(updatedAbility);
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

  const handleAddRoom = () => {
    if (newTotal.match(/^\d+$/)) {
      onChange({
        ...constraints,
        [newTotal]: {},
      });

      setInputStates(prev => ({
        ...prev,
        [newTotal]: { key: "", value: "" },
      }));

      setNewTotal("");
    }
  };

  /**
   * 在指定的总约束值下添加新字段
   */
  const handleAddField = (totalKey: string) => {
    const state = inputStates[totalKey] || { key: "", value: "" };
    if (state.key.trim()) {
      const value = FormulaParser.isFormula(state.value)
        ? state.value
        : Number(state.value) || 0;

      onChange({
        ...constraints,
        [totalKey]: {
          ...constraints[totalKey],
          [state.key.trim()]: value,
        },
      });

      setInputStates(prev => ({
        ...prev,
        [totalKey]: { key: "", value: "" },
      }));
    }
  };

  /**
   * 更新特定约束组的输入状态
   */
  const updateInputState = (
    totalKey: string,
    field: "key" | "value",
    value: string,
  ) => {
    setInputStates(prev => ({
      ...prev,
      [totalKey]: {
        ...prev[totalKey],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {constraintGroups.map(({ totalKey, fields }) => {
        if (!totalKey)
          return null;

        const entries = Object.entries(fields);
        const inputState = inputStates[totalKey] || { key: "", value: "" };

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
          <div key={totalKey} className="bg-base-200 p-4 rounded-lg">
            <div className="flex items-center mb-4">
              <h3 className="font-bold">
                {totalKey === "0" ? "动态约束组" : `总点数: ${totalPoints}`}
              </h3>
              <span
                className={`font-semibold ${remainPoints < 0 ? "text-error font-bold pl-8" : "text-success pl-8"
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center gap-1">
                    <label className="input flex items-center gap-2 w-full">
                      <span className="text-sm font-medium">{key}</span>
                      <div className="w-px h-4 bg-base-content/20"></div>
                      <input
                        type="text"
                        value={typeof value === "object" && "displayValue" in value
                          ? value.displayValue.toString()
                          : typeof value === "string" ? value : value.toString()}
                        className="grow"
                        disabled={!isEditing}
                        onChange={e => handleFieldUpdate(totalKey, key, e.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-error btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newFields = { ...fields };
                        delete newFields[key];
                        onChange({
                          ...constraints,
                          [totalKey]: newFields,
                        });
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                  {typeof value === "object" && "formula" in value && (
                    <div className="text-xs text-gray-500 pl-2">
                      {value.formula}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 分隔线，隔开创建新属性和已创建的约束组 */}
            <div className="divider"></div>

            <div className="flex gap-8 max-w-2xl">
              <input
                type="text"
                disabled={!isEditing}
                placeholder={isEditing ? "输入字段名" : "请打开编辑模式"}
                className="input input-bordered input-sm w-1/3"
                value={inputState.key}
                onChange={e => updateInputState(totalKey, "key", e.target.value)}
              />
              <input
                type="text"
                disabled={!isEditing}
                placeholder={isEditing ? "值/公式" : "请打开编辑模式"}
                className="input input-bordered input-sm w-1/2"
                value={inputState.value}
                onChange={e => updateInputState(totalKey, "value", e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleAddField(totalKey)}
                disabled={!isEditing || !inputState.key || !inputState.value}
              >
                添加字段
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <input
          type="text"
          disabled={!isEditing}
          placeholder={isEditing ? "输入总约束值（0表示动态约束）" : "请打开编辑模式"}
          className="input input-bordered"
          value={newTotal}
          onChange={e => setNewTotal(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddRoom}
          disabled={!isEditing || !newTotal}
        >
          新增约束组
        </button>
      </div>

      <div className="card-actions justify-end">
        {isEditing
          ? (
              <button
                type="submit"
                onClick={handleExitEditing}
                className="btn btn-primary"
              >
                退出
              </button>
            )
          : (
              <button type="button" onClick={() => setIsEditing(true)} className="btn btn-accent">
                编辑
              </button>
            )}
      </div>
    </div>
  );
}
