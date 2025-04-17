import type { NumericalConstraints } from "../types";
import { useState } from "react"; // 需要实现的公式解析器
// NumericalEditor.tsx
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
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  /**
   * 添加新的约束组
   */
  const handleAddGroup = () => {
    if (newTotal.match(/^\d+$/)) {
      onChange({
        ...constraints,
        [newTotal]: {},
      });
      setNewTotal("");
    }
  };

  /**
   * 在指定的总约束值下添加新字段
   */
  const handleAddField = (totalKey: string) => {
    if (newKey.trim()) {
      const value = FormulaParser.isFormula(newValue)
        ? newValue
        : Number(newValue) || 0;

      onChange({
        ...constraints,
        [totalKey]: {
          ...constraints[totalKey],
          [newKey.trim()]: value,
        },
      });
      setNewKey("");
      setNewValue("");
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(constraints).map(([totalKey, fields]) => {
        // 使用map动态渲染属性
        const entries = Object.entries(fields);
        // 计算每列应该显示的数量
        const halfLength = Math.ceil(entries.length / 2);
        // 分成两列
        const leftCol = entries.slice(0, halfLength);
        const rightCol = entries.slice(halfLength);

        return (
          <div key={totalKey} className="bg-base-200 p-4 rounded-lg">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold">
                规则名称:
                {" "}
                {totalKey === "0" ? "依赖项" : totalKey}
              </h3>
            </div>

            <div className="flex gap-4">
              {/* 左侧列 */}
              <div className="flex-1">
                {leftCol.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1 mb-2">
                    <span className="font-medium text-sm w-16 truncate">
                      {key}
                      :
                    </span>
                    <input
                      type="text"
                      value={typeof value === "string" ? value : value.toString()}
                      className="input input-bordered input-sm flex-1"
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
                    <button
                      className="btn btn-error btn-xs"
                      onClick={() => {
                        const newFields = { ...fields };
                        delete newFields[key];
                        onChange({
                          ...constraints,
                          [totalKey]: newFields,
                        });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* 中间分隔线 */}
              <div className="border-l border-base-300"></div>

              {/* 右侧列 */}
              <div className="flex-1">
                {rightCol.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-1 mb-2">
                    <span className="font-medium text-sm w-16 truncate">
                      {key}
                      :
                    </span>
                    <input
                      type="text"
                      value={typeof value === "string" ? value : value.toString()}
                      className="input input-bordered input-sm flex-1"
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
                    <button
                      type="button"
                      className="btn btn-error btn-xs"
                      onClick={() => {
                        const newFields = { ...fields };
                        delete newFields[key];
                        onChange({
                          ...constraints,
                          [totalKey]: newFields,
                        });
                      }}
                    >
                      ✕
                    </button>

                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <input
                type="text"
                placeholder="字段名称"
                className="input input-bordered input-sm flex-1"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
              <input
                type="text"
                placeholder="值/公式"
                className="input input-bordered input-sm flex-1"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
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
