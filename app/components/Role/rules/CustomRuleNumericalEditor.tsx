import { useEffect, useReducer, useRef, useState } from "react";
import AddFieldForm from "../Editors/AddFieldForm";
import EditableField from "../Editors/EditableField";

type NumericalData = Record<string, string>;

interface CustomRuleNumericalEditorProps {
  title?: string;
  data?: NumericalData;
  onSave?: (data: NumericalData) => void;
  cloneVersion: number;
}

// Reducer actions
type DataAction
  = | { type: "SYNC_PROPS"; payload: NumericalData }
    | { type: "UPDATE_FIELD"; payload: { key: string; value: string } }
    | { type: "ADD_FIELD"; payload: { key: string; value: string } }
    | { type: "DELETE_FIELD"; payload: string }
    | { type: "RENAME_FIELD"; payload: { oldKey: string; newKey: string } };

// Reducer function
function dataReducer(state: NumericalData, action: DataAction): NumericalData {
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

export default function CustomRuleNumericalEditor({
  title = "字段",
  data,
  onSave,
  cloneVersion,
}: CustomRuleNumericalEditorProps) {
  const [localData, dispatch] = useReducer(dataReducer, data ?? {});
  const [isEditing, setIsEditing] = useState(false);

  const prevCloneVersionRef = useRef(cloneVersion);

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
    <div className={`space-y-4 bg-base-200 rounded-lg p-4 duration-300 transition-opacity ${
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

      {isEditing && (
        <div>
          <AddFieldForm title="添加新字段" onAddField={handleAddField} existingKeys={Object.keys(localData)} layout="inline" />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {isEmpty
          ? (
              <div className="col-span-full flex items-center justify-center text-sm text-base-content/60 py-6 text-center border border-dashed border-base-content/20 rounded-lg bg-base-100/40">
                {isEditing ? "暂无字段，使用上方输入框添加" : "暂无字段，点击“编辑”开始添加"}
              </div>
            )
          : Object.entries(localData).map(([key, value]) => (
              <EditableField
                key={key}
                value={value}
                fieldKey={key}
                isEditing={isEditing}
                onValueChange={handleFieldUpdate}
                onDelete={handleDeleteField}
                onRename={handleRenameField}
                className={isEditing ? "" : ""}
              />
            ))}
      </div>
    </div>
  );
}
