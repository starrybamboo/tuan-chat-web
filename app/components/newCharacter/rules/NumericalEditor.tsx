import type { NumericalConstraints } from "../types";
import { useMemo, useState } from "react";
import FormulaParser from "./FormulaParser";

interface NumericalEditorProps {
  constraints: NumericalConstraints;
  onChange: (constraints: NumericalConstraints) => void;
}

// 输入状态类型
interface InputState {
  key: string;
  value: string;
}

type InputStates = Record<string, InputState>;

// 将嵌套对象转为数组格式，用于渲染
function convertNestedObjectToArray(obj: Record<string, any>): Record<string, any>[] {
  return Object.keys(obj).reduce<Record<string, any>[]>((acc, groupKey) => {
    const groupValue = obj[groupKey];

    if (typeof groupValue === "object" && groupValue !== null) {
      const item: Record<string, any> = {};
      item[groupKey] = groupKey;

      for (const subKey in groupValue) {
        item[subKey] = groupValue[subKey];
      }

      acc.push(item);
    }

    return acc;
  }, []);
}

// 还原函数：将数组转回单层对象，并去掉一级键字段
export function convertArrayToFlatObjectWithoutGroupKeys(arr: Record<string, any>[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const item of arr) {
    for (const key in item) {
      if (item[key] === key)
        continue; // 跳过一级键字段
      result[key] = item[key];
    }
  }

  return result;
}

/**
 * 数值编辑器组件
 * 负责管理角色数值相关的字段，支持公式计算和约束组
 * 以两列布局展示数值字段，提供添加、编辑和删除功能
 */
export default function NumericalEditor({
  constraints,
  onChange,
}: NumericalEditorProps) {
  const [newTotal, setNewTotal] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // 将 constraints 转换为数组格式用于渲染
  const constraintGroups = useMemo(() => convertNestedObjectToArray(constraints), [constraints]);

  // 管理每个约束组的输入状态
  const [inputStates, setInputStates] = useState<InputStates>(
    Object.keys(constraints).reduce((acc, key) => ({
      ...acc,
      [key]: { key: "", value: "" },
    }), {}),
  );

  /**
   * 添加新的约束组
   */
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
  const updateInputState = (totalKey: string, field: "key" | "value", value: string) => {
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
      {constraintGroups.map((group) => {
        const totalKey = Object.keys(group).find(k => group[k] === k); // 获取一级键
        if (!totalKey)
          return null;

        const fields = constraints[totalKey] || {};
        const entries = Object.entries(fields);
        const inputState = inputStates[totalKey] || { key: "", value: "" };

        const totalPoints = Number(totalKey);
        const currentSum = Object.values(fields).reduce((sum: number, value) => {
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
                {remainPoints >= 0
                  ? `剩余点数: ${remainPoints}`
                  : `超出点数: ${-remainPoints}`}
              </span>
            </div>

            {/* 网格布局 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {entries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-1 mb-2">
                  <label className="input flex items-center gap-2 w-full">
                    <span className="text-sm font-medium">{key}</span>
                    <div className="w-px h-4 bg-base-content/20"></div>
                    <input
                      type="text"
                      value={typeof value === "string" ? value : value.toString()}
                      className="grow"
                      disabled={!isEditing}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        onChange({
                          ...constraints,
                          [totalKey]: {
                            ...fields,
                            [key]: FormulaParser.parse(newValue),
                          },
                        });
                      }}
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
              ))}
            </div>

            {/* 分隔线 */}
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
          placeholder={isEditing ? "输入总约束值（0表示动态）" : "请打开编辑模式"}
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
                onClick={() => setIsEditing(false)}
                className="btn btn-primary"
              >
                退出
              </button>
            )
          : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-accent"
              >
                编辑
              </button>
            )}
      </div>
    </div>
  );
}
