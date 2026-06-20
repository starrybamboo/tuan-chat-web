import { useEffect, useReducer, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";

import AddFieldForm from "../Editors/AddFieldForm";
import EditableField from "../Editors/EditableField";
import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

type NumericalData = Record<string, string>;
type FieldType = "basic" | "ability" | "skill";

type NumericalEditorSmallProps = {
  data: NumericalData;
  onChange: (data: NumericalData) => void;
  roleId: number;
  ruleId: number;
  title?: string;
  fieldType: FieldType;
}

type DataAction
  = | { type: "SYNC_PROPS"; payload: NumericalData }
    | { type: "UPDATE_FIELD"; payload: { key: string; value: string } }
    | { type: "ADD_FIELD"; payload: { key: string; value: string } }
    | { type: "DELETE_FIELD"; payload: string }
    | { type: "RENAME_FIELD"; payload: { oldKey: string; newKey: string } };

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "请稍后重试";
}

export default function NumericalEditorSmall({
  data,
  onChange,
  roleId,
  ruleId,
  fieldType,
}: NumericalEditorSmallProps) {
  const { mutateAsync: updateKeyFieldAsync } = useUpdateKeyFieldByRoleIdMutation();
  const { mutateAsync: updateFieldValueAsync } = useUpdateRoleAbilityByRoleIdMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const pendingChangesRef = useRef<Record<string, string>>({});
  const latestDataRef = useRef(data);

  const [localData, dispatch] = useReducer(dataReducer, data);

  useEffect(() => {
    latestDataRef.current = data;
    const pendingChanges = pendingChangesRef.current;
    dispatch({
      type: "SYNC_PROPS",
      payload: Object.keys(pendingChanges).length > 0
        ? { ...data, ...pendingChanges }
        : data,
    });
  }, [data]);

  useEffect(() => {
    pendingChangesRef.current = {};
    dispatch({ type: "SYNC_PROPS", payload: latestDataRef.current });
  }, [roleId, ruleId, fieldType]);

  const rollbackAfterError = (error: unknown) => {
    pendingChangesRef.current = {};
    dispatch({ type: "SYNC_PROPS", payload: data });
    onChange(data);
    toast.error(`能力更新失败：${getErrorMessage(error)}`);
  };

  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      [fieldKey]: newValue,
    };
    dispatch({
      type: "UPDATE_FIELD",
      payload: { key: fieldKey, value: newValue },
    });
  };

  const handleFieldCommit = (fieldKey: string, newValue: string) => {
    void saveFieldCommit(fieldKey, newValue);
  };

  const saveFieldCommit = async (fieldKey: string, newValue: string) => {
    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };

    try {
      await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, {
        [fieldKey]: newValue,
      }));
      const pendingChanges = { ...pendingChangesRef.current };
      delete pendingChanges[fieldKey];
      pendingChangesRef.current = pendingChanges;
      onChange(updatedData);
      setEditingKey(null);
    }
    catch (error) {
      rollbackAfterError(error);
    }
  };

  const handleAddField = async (newFieldKey: string, newFieldValue: string) => {
    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };

    try {
      await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, {
        [newFieldKey]: newFieldValue,
      }));
      dispatch({
        type: "ADD_FIELD",
        payload: { key: newFieldKey, value: newFieldValue },
      });
      onChange(updatedData);
    }
    catch (error) {
      rollbackAfterError(error);
      throw error;
    }
  };

  const handleDeleteField = (fieldKey: string) => {
    void saveDeleteField(fieldKey);
  };

  const saveDeleteField = async (fieldKey: string) => {
    const updatedData = { ...localData };
    delete updatedData[fieldKey];
    const pendingChanges = { ...pendingChangesRef.current };
    delete pendingChanges[fieldKey];
    pendingChangesRef.current = pendingChanges;

    try {
      if (Object.keys(pendingChanges).length > 0) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, pendingChanges));
      }
      await updateKeyFieldAsync(buildRoleAbilityFieldKeyPayload(roleId, ruleId, fieldType, {
        [fieldKey]: null,
      }));
      dispatch({ type: "DELETE_FIELD", payload: fieldKey });
      onChange(updatedData);
      setEditingKey(prevKey => (prevKey === fieldKey ? null : prevKey));
    }
    catch (error) {
      rollbackAfterError(error);
    }
  };

  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localData) {
      return;
    }

    void saveRenameField(oldKey, newKey);
  };

  const saveRenameField = async (oldKey: string, newKey: string) => {
    const pendingChanges = { ...pendingChangesRef.current };
    const pendingValue = pendingChanges[oldKey];
    delete pendingChanges[oldKey];
    pendingChangesRef.current = pendingChanges;
    const value = localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = pendingValue ?? value;

    try {
      if (Object.keys(pendingChanges).length > 0) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, pendingChanges));
      }
      await updateKeyFieldAsync(buildRoleAbilityFieldKeyPayload(roleId, ruleId, fieldType, {
        [oldKey]: newKey,
      }));
      if (pendingValue !== undefined) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, fieldType, {
          [newKey]: pendingValue,
        }));
      }
      dispatch({
        type: "RENAME_FIELD",
        payload: { oldKey, newKey },
      });
      onChange(updatedData);
      setEditingKey(newKey);
    }
    catch (error) {
      rollbackAfterError(error);
    }
  };

  const entries = Object.entries(localData);
  const contentWrapperClass = "pr-1";

  return (
    <div className="rounded-md border border-base-200 bg-base-100/80 p-3">

      <div className={`
        ${contentWrapperClass}
        space-y-2
      `}>
        {entries.length > 0
          ? (
              <div className="flex flex-wrap gap-1.5">
                {entries.map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditingKey(prevKey => (prevKey === key ? null : key))}
                    className={`
                      badge badge-sm
                      ${
                      editingKey === key ? "badge-primary" : "badge-outline"
                    }
                    `}
                    title="点击编辑字段"
                  >
                    {key}
                    {" "}
                    :
                    {" "}
                    {String(value)}
                  </button>
                ))}
              </div>
            )
          : (
              <span className="text-[11px] text-base-content/60">暂无字段</span>
            )}

        {editingKey
          ? (
              <div className="border-t-2 pt-4 border-base-content/10">
                <div className="grid grid-cols-4 gap-2">
                  <EditableField
                    key={editingKey}
                    fieldKey={editingKey}
                    value={localData[editingKey] ?? ""}
                    isEditing
                    onValueChange={handleFieldUpdate}
                    onValueCommit={handleFieldCommit}
                    onDelete={handleDeleteField}
                    onRename={handleRenameField}
                    size="compact"
                    className="w-full col-span-4"
                    editingBackgroundClassName="bg-base-100"
                  />
                </div>
              </div>
            )
          : (
              <AddFieldForm
                onAddField={handleAddField}
                existingKeys={Object.keys(localData)}
                layout="inline"
                showTitle={false}
                placeholder={{ key: "字段名", value: "字段值" }}
              />
            )}
      </div>
    </div>
  );
}
