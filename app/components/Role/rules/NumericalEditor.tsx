import {
  useUpdateKeyFieldByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import type { KeyboardEvent } from "react";
import { useEffect, useReducer } from "react";
import AddFieldForm from "../Editors/AddFieldForm";
import EditableField from "../Editors/EditableField";

// Type for numerical data - flat structure
type NumericalData = Record<string, string>;

// 字段类型枚举
type FieldType = "basic" | "ability" | "skill";

interface NumericalEditorProps {
  data: NumericalData;
  onChange: (data: NumericalData) => void;
  roleId: number;
  ruleId: number;
  isEditing?: boolean;
  title?: string;
  fieldType: FieldType; // 新增:指定要更新的字段类型
  hideTitleOnMobile?: boolean;
  syncValueChanges?: boolean;
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
      if (areNumericalDataEqual(state, action.payload)) {
        return state;
      }
      return action.payload;
    case "UPDATE_FIELD":
      if (state[action.payload.key] === action.payload.value) {
        return state;
      }
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

function areNumericalDataEqual(a: NumericalData, b: NumericalData) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every(key => a[key] === b[key]);
}

/**
 * 数值编辑器组件
 * 使用 useReducer 管理本地数据状态,通过 useEffect 同步 props 变化
 */
export default function NumericalEditor({
  data,
  onChange,
  roleId,
  ruleId,
  isEditing: controlledIsEditing,
  title = "数值数据",
  fieldType,
  hideTitleOnMobile = false,
  syncValueChanges = false,
}: NumericalEditorProps) {
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  void controlledIsEditing;
  const headerClassName = hideTitleOnMobile
    ? "hidden md:flex justify-between items-center md:mb-4"
    : "flex justify-between items-center mb-4";

  // 使用 useReducer 管理本地数据
  const [localData, dispatch] = useReducer(dataReducer, data);

  // 使用 useEffect 同步 props.data 的变化
  useEffect(() => {
    dispatch({ type: "SYNC_PROPS", payload: data });
  }, [data]);

  const buildFieldUpdateRequest = (fields: Record<string, string | null>) => ({
    roleId,
    ruleId,
    ...(fieldType === "basic" && { basicFields: fields }),
    ...(fieldType === "ability" && { abilityFields: fields }),
    ...(fieldType === "skill" && { skillFields: fields }),
  });

  // 处理字段值更新
  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    if (localData[fieldKey] === newValue) {
      return;
    }

    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };

    dispatch({
      type: "UPDATE_FIELD",
      payload: { key: fieldKey, value: newValue },
    });

    // 仅在需要时同步到父组件，避免模板区输入时字段立即“迁移”到自定义区
    if (syncValueChanges) {
      onChange(updatedData);
    }
  };

  const handleFieldCommit = (fieldKey: string, newValue: string) => {
    if (!syncValueChanges && String(data[fieldKey] ?? "") === newValue) {
      return;
    }

    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };

    dispatch({
      type: "UPDATE_FIELD",
      payload: { key: fieldKey, value: newValue },
    });

    updateKeyField(buildFieldUpdateRequest({ [fieldKey]: newValue }), {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 添加新字段
  const handleAddField = (newFieldKey: string, newFieldValue: string) => {
    // 先计算新数据
    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };

    // 更新本地状态
    dispatch({
      type: "ADD_FIELD",
      payload: { key: newFieldKey, value: newFieldValue },
    });

    // 使用 API 更新字段 (根据 AbilityFieldUpdateRequest 定义)
    updateKeyField(buildFieldUpdateRequest({ [newFieldKey]: newFieldValue }), {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 删除字段
  const handleDeleteField = (fieldKey: string) => {
    // 先计算新数据
    const updatedData = { ...localData };
    delete updatedData[fieldKey];

    // 更新本地状态
    dispatch({ type: "DELETE_FIELD", payload: fieldKey });

    // 使用 API 删除字段（传 null 表示删除）
    updateKeyField(buildFieldUpdateRequest({ [fieldKey]: null }), {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 修改字段名
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localData) {
      return; // 新字段名不能为空、相同或重复
    }

    // 先计算新数据
    const value = localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = value;

    // 更新本地状态
    dispatch({
      type: "RENAME_FIELD",
      payload: { oldKey, newKey },
    });

    // 删除旧字段，添加新字段
    updateKeyField(buildFieldUpdateRequest({
      [oldKey]: null,
      [newKey]: String(value),
    }), {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  const handleArrowNavigation = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      return;
    }
    if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
      return;
    }

    const target = e.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (target.dataset.arrowNavControl !== "true") {
      return;
    }

    const controls = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-arrow-nav-control="true"]'),
    ).filter(el => !el.disabled && el.offsetParent !== null);
    const currentIndex = controls.indexOf(target);
    if (currentIndex === -1) {
      return;
    }

    const currentRect = target.getBoundingClientRect();
    const currentCenterX = currentRect.left + currentRect.width / 2;
    const currentCenterY = currentRect.top + currentRect.height / 2;
    const direction = e.key.replace("Arrow", "");

    const next = controls
      .filter((el, index) => index !== currentIndex)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = centerX - currentCenterX;
        const dy = centerY - currentCenterY;

        if (direction === "Right" && dx <= 1)
          return null;
        if (direction === "Left" && dx >= -1)
          return null;
        if (direction === "Down" && dy <= 1)
          return null;
        if (direction === "Up" && dy >= -1)
          return null;

        const score = direction === "Left" || direction === "Right"
          ? Math.abs(dx) + Math.abs(dy) * 3
          : Math.abs(dy) + Math.abs(dx) * 1.5;
        return { el, score };
      })
      .filter((item): item is { el: HTMLInputElement | HTMLTextAreaElement; score: number } => item !== null)
      .sort((a, b) => a.score - b.score)[0]?.el;

    if (!next) {
      return;
    }

    e.preventDefault();
    next.focus();
    next.select();
  };

  return (
    <div className="space-y-6 bg-base-200 rounded-lg p-4">
      <div className={headerClassName}>
        <h3 className={`card-title text-lg items-center gap-2 ${hideTitleOnMobile ? "hidden md:flex" : "flex"}`}>
          {title}
        </h3>
      </div>

      <div className="bg-base-200 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6" onKeyDown={handleArrowNavigation}>
          {Object.entries(localData).map(([key, value]) => {
            const strVal = String(value ?? "");

            // 计算有效字符长度，非 Latin-1 字符按两个宽度估算。
            const getVisualLength = (str: string) => Array.from(str).reduce((length, char) => {
              const codePoint = char.codePointAt(0) ?? 0;
              return length + (codePoint > 0xFF ? 2 : 1);
            }, 0);

            const keyLen = getVisualLength(key);
            const valLen = getVisualLength(strVal);

            // 桌面端估算总长度：字段名 + 间隔/图标等固定占用(约4字符) + 字段值
            const desktopEffectiveLength = keyLen + 4 + valLen;

            // 移动端估算长度：取字段名和字段值中较长的一个（因为是垂直排列）
            const mobileEffectiveLength = Math.max(keyLen, valLen);

            // Adjust layout based on content length
            // Mobile (2 cols): >= 17 chars -> full width
            // Desktop (4 cols): > 40 chars -> 4 cols (full), > 17 -> 2 cols (half), else -> 1 col (quarter)
            let colSpanClass = "";

            if (desktopEffectiveLength > 40) {
              // Very long content: occupies full line on desktop
              colSpanClass = mobileEffectiveLength >= 17 ? "col-span-2 md:col-span-4" : "col-span-1 md:col-span-4";
            }
            else if (desktopEffectiveLength > 17) {
              // Medium long content: occupies half line (2 columns on desktop)
              colSpanClass = mobileEffectiveLength >= 17 ? "col-span-2 md:col-span-2" : "col-span-1 md:col-span-2";
            }
            else {
              // Short content: single cell on desktop
              colSpanClass = mobileEffectiveLength >= 17 ? "col-span-2 md:col-span-1" : "col-span-1 md:col-span-1";
            }

            return (
              <div key={key} className={colSpanClass}>
                <EditableField
                  fieldKey={key}
                  value={value}
                  isEditing
                  onValueChange={handleFieldUpdate}
                  onValueCommit={handleFieldCommit}
                  onDelete={handleDeleteField}
                  onRename={handleRenameField}
                  className="form-control"
                  editingBackgroundClassName="bg-base-100"
                  enableArrowNavigation
                />
              </div>
            );
          })}

          <div className="col-span-full">
            <AddFieldForm
              onAddField={handleAddField}
              existingKeys={Object.keys(localData)}
              layout="inline"
              className="col-span-full pt-2 mt-2"
              enableArrowNavigation
            />
          </div>
        </div>
      </div>
    </div>
  );
}
