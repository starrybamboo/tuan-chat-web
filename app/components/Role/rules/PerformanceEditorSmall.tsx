import {
  useUpdateKeyFieldByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import { useState } from "react";
import { getGridSpan } from "@/utils/gridSpan";
import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";

interface PerformanceEditorSmallProps {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
}

export default function PerformanceEditorSmall({
  fields,
  onChange,
  abilityData: _abilityData,
  roleId,
  ruleId,
}: PerformanceEditorSmallProps) {
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const fieldKeys = Object.keys(fields);
  const contentWrapperClass = "mt-2 pr-1";

  const handleDeleteField = (key: string) => {
    const updatedFields = { ...fields };
    delete updatedFields[key];
    onChange(updatedFields);
    updateKeyField({
      ruleId,
      roleId,
      actFields: {
        [key]: null as any,
      },
    });
    setEditingKey(prevKey => (prevKey === key ? null : prevKey));
  };

  const handleAddField = (key: string, value: string) => {
    const nextKey = key.trim();
    if (!nextKey)
      return;
    onChange({ ...fields, [nextKey]: value });
    updateKeyField({
      ruleId,
      roleId,
      actFields: {
        [nextKey]: value,
      },
    });
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  const handleValueCommit = (key: string, value: string) => {
    updateKeyField(
      {
        ruleId,
        roleId,
        actFields: {
          [key]: value,
        },
      },
      {
        onSuccess: () => {
          setEditingKey(null);
        },
      },
    );
  };

  const handleRename = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in fields) {
      return;
    }
    const newFields = { ...fields };
    newFields[newKey] = newFields[oldKey];
    delete newFields[oldKey];
    onChange(newFields);
    updateKeyField({
      ruleId,
      roleId,
      actFields: {
        [oldKey]: null as any,
        [newKey]: String(newFields[newKey] ?? ""),
      },
    });
    setEditingKey(newKey);
  };

  return (
    <div className="rounded-md border border-base-200 bg-base-100/80 p-3">

      <div className={contentWrapperClass}>
        {fieldKeys.length === 0 && (
          <span className="text-[11px] text-base-content/60">暂无表演字段</span>
        )}

        <div
          className="grid gap-2 grid-cols-4"
          style={{
            gridAutoFlow: "dense",
            gridAutoRows: "minmax(64px, auto)",
          }}
        >
          {fieldKeys.map((key) => {
            const { colSpan, rowSpan } = getGridSpan(fields[key] || "");
            return (
              <div
                key={key}
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                }}
              >
                {editingKey === key
                  ? (
                      <PerformanceField
                        fieldKey={key}
                        value={fields[key] || ""}
                        onValueChange={handleValueChange}
                        onValueCommit={handleValueCommit}
                        onDelete={handleDeleteField}
                        onRename={handleRename}
                        placeholder="请输入表演描述..."
                        rowSpan={rowSpan}
                        size="compact"
                      />
                    )
                  : (
                      <div
                        className="rounded-md bg-base-200/40 px-2 py-1 h-full"
                        onDoubleClick={() => setEditingKey(key)}
                      >
                        <div className="text-[10px] font-semibold text-base-content/60">
                          {key}
                        </div>
                        <div className="text-[11px] text-base-content/80 wrap-break-words mt-1">
                          {fields[key] || "未设置"}
                        </div>
                      </div>
                    )}
              </div>
            );
          })}
        </div>

        <AddFieldForm
          onAddField={handleAddField}
          existingKeys={fieldKeys}
          layout="inline"
          showTitle={false}
          className="border-t-0 pt-2"
          placeholder={{
            key: "字段名",
            value: "字段值",
          }}
        />
      </div>
    </div>
  );
}
