import type { FocusEvent, KeyboardEvent } from "react";
import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useEffect, useReducer, useRef } from "react";
import toast from "react-hot-toast";
import AddFieldForm from "../Editors/AddFieldForm";
import EditableField from "../Editors/EditableField";
import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

// Type for numerical data - flat structure
type NumericalData = Record<string, string>;

// 字段类型枚举
type FieldType = "basic" | "ability" | "skill";

type SaveReason = "batch" | "field" | "add" | "delete" | "rename";

const NUMERIC_FIELD_SPAN_THRESHOLDS = {
  mobileFull: 17,
  mdHalf: 14,
  mdFull: 32,
  lgHalf: 17,
  lgFull: 40,
};

interface NumericalEditorProps {
  data: NumericalData;
  onChange: (data: NumericalData) => void;
  roleId: number;
  ruleId: number;
  title?: string;
  fieldType: FieldType; // 新增:指定要更新的字段类型
  hideTitleOnMobile?: boolean;
  syncValueChanges?: boolean;
  existingKeys?: string[];
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

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybeError = error as { body?: { message?: unknown }; message?: unknown };
    if (typeof maybeError.body?.message === "string" && maybeError.body.message.trim()) {
      return maybeError.body.message;
    }
    if (typeof maybeError.message === "string" && maybeError.message.trim()) {
      return maybeError.message;
    }
  }
  return "请稍后重试";
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
  title = "数值数据",
  fieldType,
  hideTitleOnMobile = false,
  syncValueChanges = false,
  existingKeys,
}: NumericalEditorProps) {
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  const { mutate: updateFieldValue } = useUpdateRoleAbilityByRoleIdMutation();
  const pendingChangesRef = useRef<Record<string, string>>({});
  const headerClassName = hideTitleOnMobile
    ? "hidden md:flex justify-between items-center md:mb-4"
    : "flex justify-between items-center mb-4";

  // 使用 useReducer 管理本地数据
  const [localData, dispatch] = useReducer(dataReducer, data);
  const reservedKeys = existingKeys ?? Object.keys(localData);
  const isReservedFieldKey = (key: string, currentKey?: string) =>
    key !== currentKey && reservedKeys.includes(key);

  // 使用 useEffect 同步 props.data 的变化
  useEffect(() => {
    dispatch({ type: "SYNC_PROPS", payload: data });
  }, [data]);

  const buildFieldUpdateRequest = (fields: Record<string, string | null>) =>
    buildRoleAbilityFieldKeyPayload(roleId, ruleId, fieldType, fields);

  const buildValueUpdateRequest = (fields: Record<string, string>) =>
    buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, fields);

  const handleFieldSaveSuccess = (updatedData: NumericalData, reason: SaveReason = "batch") => {
    onChange(updatedData);
    toast.success(reason === "batch" ? "能力已批量更新" : "能力已更新");
  };

  const handleFieldSaveError = (error: unknown, fallbackData: NumericalData) => {
    dispatch({ type: "SYNC_PROPS", payload: fallbackData });
    onChange(fallbackData);
    toast.error(`能力更新失败：${getErrorMessage(error)}`);
  };

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
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      [fieldKey]: newValue,
    };
  };

  const commitPendingChanges = (
    nextData: NumericalData = localData,
    reason: SaveReason = "batch",
    fallbackData: NumericalData = data,
  ) => {
    const pendingChanges = pendingChangesRef.current;
    if (Object.keys(pendingChanges).length === 0) {
      return;
    }

    const updatedData = {
      ...nextData,
      ...pendingChanges,
    };

    pendingChangesRef.current = {};
    updateFieldValue(buildValueUpdateRequest(pendingChanges), {
      onSuccess: () => {
        handleFieldSaveSuccess(updatedData, reason);
      },
      onError: (error) => {
        pendingChangesRef.current = {
          ...pendingChanges,
          ...pendingChangesRef.current,
        };
        handleFieldSaveError(error, fallbackData);
      },
    });
  };

  const takePendingValue = (fieldKey: string) => {
    const pendingValue = pendingChangesRef.current[fieldKey];
    if (Object.prototype.hasOwnProperty.call(pendingChangesRef.current, fieldKey)) {
      const remainingChanges = { ...pendingChangesRef.current };
      delete remainingChanges[fieldKey];
      pendingChangesRef.current = remainingChanges;
    }
    return pendingValue;
  };

  const handleFieldCommit = (fieldKey: string, newValue: string) => {
    if (localData[fieldKey] !== newValue) {
      dispatch({
        type: "UPDATE_FIELD",
        payload: { key: fieldKey, value: newValue },
      });
      pendingChangesRef.current = {
        ...pendingChangesRef.current,
        [fieldKey]: newValue,
      };
    }
    commitPendingChanges({ ...localData, [fieldKey]: newValue }, "field");
  };

  // 添加新字段
  const handleAddField = (newFieldKey: string, newFieldValue: string) => {
    if (!newFieldKey.trim() || isReservedFieldKey(newFieldKey)) {
      return;
    }

    // 先计算新数据
    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };

    commitPendingChanges(updatedData, "add", updatedData);

    // 更新本地状态
    dispatch({
      type: "ADD_FIELD",
      payload: { key: newFieldKey, value: newFieldValue },
    });
    onChange(updatedData);

    updateFieldValue(buildValueUpdateRequest({ [newFieldKey]: newFieldValue }), {
      onSuccess: () => {
        toast.success("能力已更新");
      },
      onError: error => handleFieldSaveError(error, data),
    });
  };

  // 删除字段
  const handleDeleteField = (fieldKey: string) => {
    takePendingValue(fieldKey);

    // 先计算新数据
    const updatedData = { ...localData };
    delete updatedData[fieldKey];

    commitPendingChanges(updatedData, "delete", updatedData);

    // 更新本地状态
    dispatch({ type: "DELETE_FIELD", payload: fieldKey });

    updateKeyField(buildFieldUpdateRequest({ [fieldKey]: null }), {
      onSuccess: () => {
        handleFieldSaveSuccess(updatedData);
      },
      onError: error => handleFieldSaveError(error, data),
    });
  };

  // 修改字段名
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || isReservedFieldKey(newKey, oldKey)) {
      return; // 新字段名不能为空、相同或重复
    }

    const pendingValue = takePendingValue(oldKey);

    // 先计算新数据
    const value = pendingValue ?? localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = value;

    commitPendingChanges(updatedData, "rename", updatedData);

    // 更新本地状态
    dispatch({
      type: "RENAME_FIELD",
      payload: { oldKey, newKey },
    });
    onChange(updatedData);

    updateKeyField(buildFieldUpdateRequest({
      [oldKey]: newKey,
    }), {
      onSuccess: () => {
        if (pendingValue === undefined) {
          toast.success("能力已更新");
          return;
        }
        updateFieldValue(buildValueUpdateRequest({ [newKey]: pendingValue }), {
          onSuccess: () => {
            handleFieldSaveSuccess(updatedData, "rename");
          },
          onError: error => handleFieldSaveError(error, data),
        });
      },
      onError: error => handleFieldSaveError(error, data),
    });
  };

  const handleGridBlur = (e: FocusEvent<HTMLDivElement>) => {
    const nextTarget = e.relatedTarget;
    if (nextTarget instanceof Node && e.currentTarget.contains(nextTarget)) {
      return;
    }
    commitPendingChanges();
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
      e.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-arrow-nav-control=\"true\"]"),
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

        const rowThreshold = Math.max(8, currentRect.height / 2);
        const colThreshold = Math.max(8, currentRect.width / 2);

        if ((direction === "Right" || direction === "Left") && Math.abs(dy) > rowThreshold)
          return null;
        if ((direction === "Up" || direction === "Down") && Math.abs(dx) > colThreshold)
          return null;
        if (direction === "Right" && dx <= 1)
          return null;
        if (direction === "Left" && dx >= -1)
          return null;
        if (direction === "Down" && dy <= 1)
          return null;
        if (direction === "Up" && dy >= -1)
          return null;

        const score = direction === "Left" || direction === "Right"
          ? Math.abs(dx)
          : Math.abs(dy);
        return { el, score };
      })
      .filter((item): item is { el: HTMLInputElement | HTMLTextAreaElement; score: number } => item !== null)
      .sort((a, b) => a.score - b.score)[0]
      ?.el;

    if (!next) {
      return;
    }

    e.preventDefault();
    next.focus();
    next.select();
  };

  return (
    <div className="space-y-6 bg-base-200 rounded-lg p-4 [contain:layout_paint] [overflow-anchor:none]">
      <div className={headerClassName}>
        <h3 className={`card-title text-lg items-center gap-2 ${hideTitleOnMobile ? "hidden md:flex" : "flex"}`}>
          {title}
        </h3>
      </div>

      <div className="bg-base-200 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 min-h-32" onKeyDown={handleArrowNavigation} onBlur={handleGridBlur}>
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

            const mobileSpanClass = mobileEffectiveLength >= NUMERIC_FIELD_SPAN_THRESHOLDS.mobileFull
              ? "col-span-2"
              : "col-span-1";
            const mdSpanClass = desktopEffectiveLength > NUMERIC_FIELD_SPAN_THRESHOLDS.mdFull
              ? "md:col-span-4"
              : desktopEffectiveLength > NUMERIC_FIELD_SPAN_THRESHOLDS.mdHalf
                ? "md:col-span-2"
                : "md:col-span-1";
            const lgSpanClass = desktopEffectiveLength > NUMERIC_FIELD_SPAN_THRESHOLDS.lgFull
              ? "lg:col-span-4"
              : desktopEffectiveLength > NUMERIC_FIELD_SPAN_THRESHOLDS.lgHalf
                ? "lg:col-span-2"
                : "lg:col-span-1";
            const colSpanClass = `${mobileSpanClass} ${mdSpanClass} ${lgSpanClass}`;

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
                  commitOnBlur={false}
                />
              </div>
            );
          })}

          <div className="col-span-full">
            <AddFieldForm
              onAddField={handleAddField}
              existingKeys={reservedKeys}
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
