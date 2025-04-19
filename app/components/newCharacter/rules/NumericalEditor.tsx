import type { NumericalConstraints } from "../types";
import { useState } from "react"; // 需要实现的公式解析器
import FormulaParser from "./FormulaParser";

interface NumericalEditorProps {
  constraints: NumericalConstraints;
  onChange: (constraints: NumericalConstraints) => void;
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

  // 使用Map存储每个约束组的输入状态
  const [inputStates, setInputStates] = useState<Map<string, { key: string; value: string }>>(
    new Map(Object.keys(constraints).map(key => [key, { key: "", value: "" }])),
  );

  /**
   * 添加新的约束组
   */
  const handleAddGroup = () => {
    if (newTotal.match(/^\d+$/)) {
      onChange({
        ...constraints,
        [newTotal]: {},
      });

      // 为新约束组添加输入状态
      setInputStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(newTotal, { key: "", value: "" });
        return newMap;
      });

      setNewTotal("");
    }
  };

  /**
   * 在指定的总约束值下添加新字段
   */
  const handleAddField = (totalKey: string) => {
    const state = inputStates.get(totalKey) || { key: "", value: "" };
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

      // 清空当前约束组的输入
      setInputStates((prev) => {
        const newMap = new Map(prev);
        newMap.set(totalKey, { key: "", value: "" });
        return newMap;
      });
    }
  };

  // 更新特定约束组的输入状态
  const updateInputState = (totalKey: string, field: "key" | "value", value: string) => {
    setInputStates((prev) => {
      const newMap = new Map(prev);
      const currentState = prev.get(totalKey) || { key: "", value: "" };
      newMap.set(totalKey, { ...currentState, [field]: value });
      return newMap;
    });
  };

  return (
    <div className="space-y-6">
      {Object.entries(constraints).map(([totalKey, fields]) => {
        const entries = Object.entries(fields);
        const inputState = inputStates.get(totalKey) || { key: "", value: "" };

        const totalPoints = Number(totalKey);
        // 计算当前字段值的总和
        const currentSum = Object.values(fields).reduce((sum: number, value) => {
          const parsed = typeof value === "string"
            ? FormulaParser.parse(value)
            : Number(value);

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
                className={`font-semibold ${
                  remainPoints < 0
                    ? "text-error font-bold pl-8"
                    : "text-success pl-8"
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
                <div key={key} className="flex items-center gap-1 mb-2 group">
                  <label className="input flex items-center gap-2">
                    <span className="text-sm font-medium">{key}</span>
                    <div className="w-px h-4 bg-base-content/20"></div>
                    <input
                      type="text"
                      value={typeof value === "string" ? value : value.toString()}
                      className="grow"
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
                  {/* 小删除按钮，未来也许可以考虑做一个撤回和继续的按钮 */}
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
                      <path
                        d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
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
                placeholder="字段名称"
                className="input input-bordered input-sm w-1/3"
                value={inputState.key}
                onChange={e => updateInputState(totalKey, "key", e.target.value)}
              />
              <input
                type="text"
                placeholder="值/公式"
                className="input input-bordered input-sm w-1/2"
                value={inputState.value}
                onChange={e => updateInputState(totalKey, "value", e.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleAddField(totalKey)}
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
          placeholder="输入总约束值（0表示动态）"
          className="input input-bordered"
          value={newTotal}
          onChange={e => setNewTotal(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddGroup}
        >
          新增约束组
        </button>
      </div>
    </div>
  );
}
