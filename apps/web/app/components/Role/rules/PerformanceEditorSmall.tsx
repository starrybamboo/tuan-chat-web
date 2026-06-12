import type { FocusEvent, KeyboardEvent } from "react";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import { getGridSpan } from "@/utils/gridSpan";
import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";

import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";
import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

type PerformanceEditorSmallProps = {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "请稍后重试";
}

export default function PerformanceEditorSmall({
  fields,
  onChange,
  abilityData: _abilityData,
  roleId,
  ruleId,
}: PerformanceEditorSmallProps) {
  const { mutateAsync: updateKeyFieldAsync } = useUpdateKeyFieldByRoleIdMutation();
  const { mutate: updateFieldValue, mutateAsync: updateFieldValueAsync } = useUpdateRoleAbilityByRoleIdMutation();
  const pendingChangesRef = useRef<Record<string, string>>({});
  const [localFields, setLocalFields] = useState(fields);

  const fieldKeys = Object.keys(localFields);
  const contentWrapperClass = "mt-2 pr-1";

  useEffect(() => {
    pendingChangesRef.current = {};
    setLocalFields(fields);
  }, [fields, roleId, ruleId]);

  const restoreFieldsAfterError = (error: unknown) => {
    pendingChangesRef.current = {};
    setLocalFields(fields);
    onChange(fields);
    toast.error(`背景描述更新失败：${getErrorMessage(error)}`);
  };

  const handleDeleteField = (key: string) => {
    void saveDeleteField(key);
  };

  const saveDeleteField = async (key: string) => {
    takePendingValue(key);
    const pendingChanges = pendingChangesRef.current;
    const updatedFields = { ...localFields };
    delete updatedFields[key];
    pendingChangesRef.current = {};

    try {
      if (Object.keys(pendingChanges).length > 0) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", pendingChanges));
      }
      await updateKeyFieldAsync(buildRoleAbilityFieldKeyPayload(roleId, ruleId, "act", {
        [key]: null,
      }));
      setLocalFields(updatedFields);
      onChange(updatedFields);
    }
    catch (error) {
      pendingChangesRef.current = {
        ...pendingChanges,
        ...pendingChangesRef.current,
      };
      restoreFieldsAfterError(error);
    }
  };

  const handleAddField = async (key: string, value: string) => {
    const nextKey = key.trim();
    if (!nextKey || nextKey in localFields)
      return;
    const pendingChanges = pendingChangesRef.current;
    const updatedFields = { ...localFields, ...pendingChanges, [nextKey]: value };
    pendingChangesRef.current = {};

    try {
      await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
        ...pendingChanges,
        [nextKey]: value,
      }));
      setLocalFields(updatedFields);
      onChange(updatedFields);
    }
    catch (error) {
      pendingChangesRef.current = {
        ...pendingChanges,
        ...pendingChangesRef.current,
      };
      restoreFieldsAfterError(error);
      throw error;
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setLocalFields(prev => ({ ...prev, [key]: value }));
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      [key]: value,
    };
  };

  const commitPendingChanges = () => {
    const pendingChanges = pendingChangesRef.current;
    if (Object.keys(pendingChanges).length === 0) {
      return;
    }
    const updatedFields = {
      ...localFields,
      ...pendingChanges,
    };
    pendingChangesRef.current = {};
    updateFieldValue(
      buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
        ...pendingChanges,
      }),
      {
        onSuccess: () => {
          onChange(updatedFields);
        },
        onError: (error) => {
          pendingChangesRef.current = {
            ...pendingChanges,
            ...pendingChangesRef.current,
          };
          restoreFieldsAfterError(error);
        },
      },
    );
  };

  const takePendingValue = (key: string) => {
    const pendingValue = pendingChangesRef.current[key];
    if (Object.prototype.hasOwnProperty.call(pendingChangesRef.current, key)) {
      const remainingChanges = { ...pendingChangesRef.current };
      delete remainingChanges[key];
      pendingChangesRef.current = remainingChanges;
    }
    return pendingValue;
  };

  const handleRename = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localFields) {
      return;
    }
    void saveRename(oldKey, newKey);
  };

  const saveRename = async (oldKey: string, newKey: string) => {
    const pendingValue = takePendingValue(oldKey);
    const pendingChanges = pendingChangesRef.current;
    const newFields = { ...localFields, ...pendingChanges };
    newFields[newKey] = pendingValue ?? newFields[oldKey];
    delete newFields[oldKey];
    pendingChangesRef.current = {};

    try {
      if (Object.keys(pendingChanges).length > 0) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", pendingChanges));
      }
      await updateKeyFieldAsync(buildRoleAbilityFieldKeyPayload(roleId, ruleId, "act", {
        [oldKey]: newKey,
      }));
      if (pendingValue !== undefined) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
          [newKey]: pendingValue,
        }));
      }
      setLocalFields(newFields);
      onChange(newFields);
    }
    catch (error) {
      pendingChangesRef.current = {
        ...pendingChanges,
        ...pendingChangesRef.current,
      };
      if (pendingValue !== undefined) {
        pendingChangesRef.current[oldKey] = pendingValue;
      }
      restoreFieldsAfterError(error);
    }
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
      .filter((_el, index) => index !== currentIndex)
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
    <div className="rounded-md border border-base-200 bg-base-100/80 p-3">

      <div className={contentWrapperClass} onBlur={handleGridBlur} onKeyDown={handleArrowNavigation}>
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
            const { colSpan, rowSpan } = getGridSpan(localFields[key] || "");
            return (
              <div
                key={key}
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                }}
              >
                <PerformanceField
                  fieldKey={key}
                  value={localFields[key] || ""}
                  onValueChange={handleValueChange}
                  onDelete={handleDeleteField}
                  onRename={handleRename}
                  placeholder="请输入表演描述..."
                  rowSpan={rowSpan}
                  size="compact"
                  enableArrowNavigation
                  commitOnBlur={false}
                />
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
          enableArrowNavigation
        />
      </div>
    </div>
  );
}
