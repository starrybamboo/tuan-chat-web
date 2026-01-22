import {
  useUpdateKeyFieldByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useEffect, useReducer, useState } from "react";
import AddFieldForm from "../Editors/AddFieldForm";
import EditableField from "../Editors/EditableField";

type NumericalData = Record<string, string>;
type FieldType = "basic" | "ability" | "skill";

interface NumericalEditorSmallProps {
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

export default function NumericalEditorSmall({
  data,
  onChange,
  roleId,
  ruleId,
  fieldType,
}: NumericalEditorSmallProps) {
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [localData, dispatch] = useReducer(dataReducer, data);

  useEffect(() => {
    dispatch({ type: "SYNC_PROPS", payload: data });
  }, [data]);

  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    dispatch({
      type: "UPDATE_FIELD",
      payload: { key: fieldKey, value: newValue },
    });
  };

  const handleFieldCommit = (fieldKey: string, newValue: string) => {
    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };

    const fieldUpdateRequest = {
      roleId,
      ruleId,
      ...(fieldType === "basic" && { basicFields: { [fieldKey]: newValue } }),
      ...(fieldType === "ability" && { abilityFields: { [fieldKey]: newValue } }),
      ...(fieldType === "skill" && { skillFields: { [fieldKey]: newValue } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
        setEditingKey(null);
      },
    });
  };

  const handleAddField = (newFieldKey: string, newFieldValue: string) => {
    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };

    dispatch({
      type: "ADD_FIELD",
      payload: { key: newFieldKey, value: newFieldValue },
    });

    const fieldUpdateRequest = {
      roleId,
      ruleId,
      ...(fieldType === "basic" && { basicFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "ability" && { abilityFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "skill" && { skillFields: { [newFieldKey]: newFieldValue } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  const handleDeleteField = (fieldKey: string) => {
    const updatedData = { ...localData };
    delete updatedData[fieldKey];

    dispatch({ type: "DELETE_FIELD", payload: fieldKey });

    const fieldUpdateRequest = {
      roleId,
      ruleId,
      ...(fieldType === "basic" && { basicFields: { [fieldKey]: null as any } }),
      ...(fieldType === "ability" && { abilityFields: { [fieldKey]: null as any } }),
      ...(fieldType === "skill" && { skillFields: { [fieldKey]: null as any } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
        setEditingKey(prevKey => (prevKey === fieldKey ? null : prevKey));
      },
    });
  };

  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localData) {
      return;
    }

    const value = localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = value;

    dispatch({
      type: "RENAME_FIELD",
      payload: { oldKey, newKey },
    });

    const fieldUpdateRequest = {
      roleId,
      ruleId,
      ...(fieldType === "basic" && {
        basicFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
      ...(fieldType === "ability" && {
        abilityFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
      ...(fieldType === "skill" && {
        skillFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
        setEditingKey(newKey);
      },
    });
  };

  const entries = Object.entries(localData);
  const contentWrapperClass = "pr-1";

  return (
    <div className="rounded-md border border-base-200 bg-base-100/80 p-3">

      <div className={`${contentWrapperClass} space-y-2`}>
        {entries.length > 0
          ? (
              <div className="flex flex-wrap gap-1.5">
                {entries.map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEditingKey(prevKey => (prevKey === key ? null : key))}
                    className={`badge badge-sm ${
                      editingKey === key ? "badge-primary" : "badge-outline"
                    }`}
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
