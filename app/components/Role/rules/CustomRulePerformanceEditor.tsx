import { useEffect, useReducer, useRef, useState } from "react";
import { useIsMobile } from "@/utils/getScreenSize";
import { getGridSpan, getGridSpanMobile } from "@/utils/gridSpan";

import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";

interface CustomRulePerformanceEditorProps {
  title?: string;
  data?: Record<string, string>;
  onSave?: (data: Record<string, string>) => void;
  cloneVersion: number;
  onEditingChange?: (editing: boolean) => void;
}

// Reducer actions
type DataAction
  = | { type: "SYNC_PROPS"; payload: Record<string, string> }
    | { type: "UPDATE_FIELD"; payload: { key: string; value: string } }
    | { type: "ADD_FIELD"; payload: { key: string; value: string } }
    | { type: "DELETE_FIELD"; payload: string }
    | { type: "RENAME_FIELD"; payload: { oldKey: string; newKey: string } };

// Reducer function
function dataReducer(state: Record<string, string>, action: DataAction): Record<string, string> {
  switch (action.type) {
    case "SYNC_PROPS":
      return action.payload;
    case "UPDATE_FIELD":
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    case "ADD_FIELD":
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
    case "DELETE_FIELD": {
      const newState = { ...state };
      delete newState[action.payload];
      return newState;
    }
    case "RENAME_FIELD": {
      const { oldKey, newKey } = action.payload;
      const value = state[oldKey];
      const newState = { ...state };
      delete newState[oldKey];
      newState[newKey] = value;
      return newState;
    }
    default:
      return state;
  }
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 展示方式被划分为了 短字段、长字段和携带物品 三种不同的展示方式
 */
export default function CustomRulePerformanceEditor({
  title,
  data,
  onSave,
  cloneVersion,
  onEditingChange,
}: CustomRulePerformanceEditorProps) {
  const [localData, dispatch] = useReducer(dataReducer, data ?? {});
  // 是否编辑
  const [isEditing, setIsEditing] = useState(false);
  // 是否移动端
  const isMobile = useIsMobile();

  const prevCloneVersionRef = useRef(cloneVersion);

  const longFieldKeys = [""];
  const shortFields = Object.keys(localData)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  // 非编辑态时，允许外部 props 同步本地展示
  useEffect(() => {
    if (!isEditing) {
      dispatch({ type: "SYNC_PROPS", payload: data ?? {} });
    }
  }, [data, isEditing]);

  useEffect(() => {
    // 依赖里包含 data 以满足 exhaustive-deps，但只在 cloneVersion 真变化时才重置。
    if (cloneVersion === prevCloneVersionRef.current) {
      return;
    }

    prevCloneVersionRef.current = cloneVersion;
    dispatch({ type: "SYNC_PROPS", payload: data ?? {} });
    setIsEditing(false);
  }, [cloneVersion, data]);

  // 将编辑态变化上报给父组件，用于保存前校验
  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  // 组件卸载时清理编辑态（例如切换 Tab/页面时避免残留）
  useEffect(() => {
    return () => {
      onEditingChange?.(false);
    };
  }, [onEditingChange]);

  const isEmpty = !localData || Object.keys(localData).length === 0;

  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    dispatch({ type: "UPDATE_FIELD", payload: { key: fieldKey, value: newValue } });
  };

  const handleAddField = (newFieldKey: string, newFieldValue: string) => {
    const key = newFieldKey.trim();
    if (!key) {
      return;
    }
    if (key in (localData ?? {})) {
      return;
    }
    dispatch({ type: "ADD_FIELD", payload: { key, value: String(newFieldValue ?? "") } });
  };

  const handleDeleteField = (fieldKey: string) => {
    dispatch({ type: "DELETE_FIELD", payload: fieldKey });
  };

  const handleRenameField = (oldKey: string, newKey: string) => {
    const nextKey = newKey.trim();
    if (!nextKey || nextKey === oldKey) {
      return;
    }
    if (nextKey in (localData ?? {})) {
      return;
    }
    dispatch({ type: "RENAME_FIELD", payload: { oldKey, newKey: nextKey } });
  };

  const handleStartEditing = () => {
    // 开始编辑时，以当前 props 为基准重置一次，避免编辑旧数据
    dispatch({ type: "SYNC_PROPS", payload: data ?? {} });
    setIsEditing(true);
  };

  const handleCancel = () => {
    dispatch({ type: "SYNC_PROPS", payload: data ?? {} });
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 transition-opacity duration-300 ${
      isEditing ? "ring-2 ring-primary" : ""
    }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="card-title text-lg flex items-center gap-2">{title}</h3>
        <div className="flex items-center gap-2">
          {!isEditing
            ? (
                <button type="button" className="btn btn-sm btn-accent" onClick={handleStartEditing}>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    编辑
                  </span>
                </button>
              )
            : (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleCancel}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      // 只在点击应用时，向父级提交变更（不会触发后端交互）
                      onSave?.(localData ?? {});
                      handleSave();
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      应用
                    </span>
                  </button>
                </>
              )}
        </div>
      </div>

      {/* 表演字段区域 - 响应式布局 */}
      <div
        className="grid gap-4 grid-cols-2 md:grid-cols-4"
        style={{
          gridAutoFlow: "dense",
          gridAutoRows: "minmax(80px, auto)",
        }}
      >
        {/* 添加新字段区域 - 占满整行 */}
        {isEditing && (
          <div className="col-span-full">
            <AddFieldForm
              onAddField={handleAddField}
              existingKeys={shortFields}
              layout="stacked"
              placeholder={{
                key: "字段名（如：性格特点、背景故事等）",
                value: "请输入表演描述...",
              }}
              title="添加新表演字段"
              showTitle={true}
            />
          </div>
        )}
        {isEmpty
          ? (
              <div className="col-span-full flex items-center justify-center text-sm text-base-content/60 py-6 text-center border border-dashed border-base-content/20 rounded-lg bg-base-100/40">
                {isEditing ? "暂无字段，使用上方输入框添加" : "暂无字段，点击“编辑”开始添加"}
              </div>
            )
          : shortFields.map((key) => {
              const { colSpan, rowSpan } = isMobile
                ? getGridSpanMobile(localData[key])
                : getGridSpan(localData[key]);

              return (
                <div
                  key={key}
                  style={{
                    gridColumn: `span ${colSpan}`,
                    gridRow: `span ${rowSpan}`,
                  }}
                >
                  {isEditing
                    ? (
                        <PerformanceField
                          fieldKey={key}
                          value={localData[key] || ""}
                          onValueChange={handleFieldUpdate}
                          onDelete={handleDeleteField}
                          onRename={handleRenameField}
                          placeholder="请输入表演描述..."
                          rowSpan={rowSpan}
                        />
                      )
                    : (
                        <div className="card bg-base-100 shadow-sm p-2 h-full">
                          <div className="divider">{key}</div>
                          <div className="text-base-content mt-0.5 flex justify-center p-2">
                            <div className="text-left break-all">
                              {localData[key] || <span className="text-base-content/50">未设置</span>}
                            </div>
                          </div>
                        </div>
                      )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
