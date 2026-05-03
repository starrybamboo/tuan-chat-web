import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";
import type { FocusEvent, KeyboardEvent } from "react";
import { useRef } from "react";
import { useIsMobile } from "@/utils/getScreenSize";
import { getGridSpan, getGridSpanMobile } from "@/utils/gridSpan";

import AddFieldForm from "../Editors/AddFieldForm";
import PerformanceField from "../Editors/PerformanceField";
import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

interface PerformanceEditorProps {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
  hideTitleOnMobile?: boolean;
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 展示方式被划分为了 短字段、长字段和携带物品 三种不同的展示方式
 */
export default function PerformanceEditor({
  fields,
  onChange,
  abilityData,
  roleId,
  ruleId,
  hideTitleOnMobile = false,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFieldValue } = useUpdateRoleAbilityByRoleIdMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldByRoleIdMutation();
  const pendingChangesRef = useRef<Record<string, string>>({});
  const headerClassName = hideTitleOnMobile
    ? "hidden md:flex justify-between items-center md:mb-4"
    : "flex justify-between items-center mb-4";
  // 是否移动端
  const isMobile = useIsMobile();

  const longFieldKeys = [""];
  const shortFields = Object.keys(abilityData || fields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  const handleDeleteField = (key: string) => {
    takePendingValue(key);
    commitPendingChanges();
    const nextFields = { ...fields };
    delete nextFields[key];
    onChange(nextFields);
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
    updateFieldValue(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
      ...pendingChanges,
    }));
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
    <div className="space-y-6 bg-base-200 rounded-lg p-4">
      <div className={headerClassName}>
        <h3 className={`card-title text-lg items-center gap-2 ml-1 ${hideTitleOnMobile ? "hidden md:flex" : "flex"}`}>
          基本信息
        </h3>
      </div>

      {/* 表演字段区域 - 响应式布局 */}
      <div
        className="grid gap-4 grid-cols-2 md:grid-cols-4"
        onBlur={handleGridBlur}
        onKeyDown={handleArrowNavigation}
        style={{
          gridAutoFlow: "dense",
          gridAutoRows: "minmax(80px, auto)",
        }}
      >
        {shortFields.map((key) => {
          const { colSpan, rowSpan } = isMobile
            ? getGridSpanMobile(fields[key])
            : getGridSpan(fields[key]);

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
                enableArrowNavigation
                commitOnBlur={false}
              />
            </div>
          );
        })}

        {/* 添加新字段区域 - 占满整行 */}
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
            enableArrowNavigation
          />
        </div>
      </div>
    </div>
  );
}
