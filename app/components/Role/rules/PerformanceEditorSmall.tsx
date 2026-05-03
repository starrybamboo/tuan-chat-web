import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import type { FocusEvent, KeyboardEvent } from "react";
import { useRef } from "react";
import { getGridSpan } from "@/utils/gridSpan";
import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";
import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

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
  const { mutate: updateFieldValue } = useUpdateRoleAbilityByRoleIdMutation();
  const pendingChangesRef = useRef<Record<string, string>>({});

  const fieldKeys = Object.keys(fields);
  const contentWrapperClass = "mt-2 pr-1";

  const handleDeleteField = (key: string) => {
    takePendingValue(key);
    commitPendingChanges();
    const updatedFields = { ...fields };
    delete updatedFields[key];
    onChange(updatedFields);
    updateKeyField(buildRoleAbilityFieldKeyPayload(roleId, ruleId, "act", {
      [key]: null,
    }));
  };

  const handleAddField = (key: string, value: string) => {
    const nextKey = key.trim();
    if (!nextKey || nextKey in fields)
      return;
    commitPendingChanges();
    onChange({ ...fields, [nextKey]: value });
    updateFieldValue(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
      [nextKey]: value,
    }));
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...fields, [key]: value });
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
    pendingChangesRef.current = {};
    updateFieldValue(
      buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
        ...pendingChanges,
      }),
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
    if (!newKey.trim() || newKey === oldKey || newKey in fields) {
      return;
    }
    const pendingValue = takePendingValue(oldKey);
    commitPendingChanges();
    const newFields = { ...fields };
    newFields[newKey] = pendingValue ?? newFields[oldKey];
    delete newFields[oldKey];
    onChange(newFields);
    updateKeyField(buildRoleAbilityFieldKeyPayload(roleId, ruleId, "act", {
      [oldKey]: newKey,
    }), {
      onSuccess: () => {
        if (pendingValue === undefined) {
          return;
        }
        updateFieldValue(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
          [newKey]: pendingValue,
        }));
      },
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
            const { colSpan, rowSpan } = getGridSpan(fields[key] || "");
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
                  value={fields[key] || ""}
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
