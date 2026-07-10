import { useState } from "react";

import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";

import type { Role } from "./types";

type RoleBasicInfoEditorProps = {
  localRole: Role;
  maxRoleNameLength: number;
  maxDescriptionLength: number;
  onBaseRoleSave: (updatedRole: Role) => void;
  supportingText?: string;
  align?: "left" | "center";
  className?: string;
  nameClassName?: string;
  nameDisplayClassName?: string;
  nameTitle?: string;
  descriptionDisplayClassName?: string;
  descriptionTitle?: string;
  descriptionButtonClassName?: string;
  descriptionEditorClassName?: string;
  descriptionTextareaClassName?: string;
  showName?: boolean;
  showDescription?: boolean;
}

export default function RoleBasicInfoEditor({
  localRole,
  maxRoleNameLength,
  maxDescriptionLength,
  onBaseRoleSave,
  supportingText,
  align = "left",
  className = "",
  nameClassName = "",
  nameDisplayClassName = "",
  nameTitle,
  descriptionDisplayClassName = "",
  descriptionTitle,
  descriptionButtonClassName = "",
  descriptionEditorClassName = "",
  descriptionTextareaClassName = "",
  showName = true,
  showDescription = true,
}: RoleBasicInfoEditorProps) {
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(localRole.description ?? "");

  const textAlignClassName = align === "center" ? "text-center" : "text-left";
  const nameUnderlineClassName = align === "center"
    ? "after:left-1/2 after:-translate-x-1/2"
    : "after:left-0 after:translate-x-0";
  const descriptionAlignClassName = align === "center"
    ? "justify-center"
    : "justify-start";
  const descriptionLength = descriptionDraft.length;
  const descriptionCounterClassName = descriptionLength > maxDescriptionLength ? "text-error" : "text-base-content/60";

  const handleNameCommit = (nextName: string) => {
    onBaseRoleSave({
      ...localRole,
      name: nextName,
    });
  };

  const handleDescriptionCancel = () => {
    setDescriptionDraft(localRole.description ?? "");
    setIsDescriptionEditing(false);
  };

  const handleDescriptionStartEditing = () => {
    setDescriptionDraft(localRole.description ?? "");
    setIsDescriptionEditing(true);
  };

  const handleDescriptionSave = () => {
    const nextDescription = descriptionDraft;
    setIsDescriptionEditing(false);
    if (nextDescription === (localRole.description ?? "")) {
      return;
    }
    setDescriptionDraft(nextDescription);
    onBaseRoleSave({
      ...localRole,
      description: nextDescription,
    });
  };

  return (
    <div className={`
      space-y-3
      ${className}
    `}>
      {showName && (
        <DoubleClickEditableText
          value={localRole.name ?? ""}
          onCommit={nextName => handleNameCommit(nextName)}
          trigger="click"
          commitOnBlur
          commitOnEnter
          invalidBehavior="keepEditing"
          placeholder="未命名角色"
          validate={nextName => nextName.length > maxRoleNameLength ? `角色名称不能超过${maxRoleNameLength}字` : null}
          inputProps={{
            maxLength: maxRoleNameLength,
          }}
          className="block w-full"
          inputClassName={`w-full rounded-md border border-base-content/15 bg-base-100 px-3 py-2 ${
            align === "center" ? "text-center" : "text-left"
          } ${nameClassName}`}
          renderDisplay={({ displayValue, startEditing }) => (
            <button
              type="button"
              onClick={startEditing}
              title={nameTitle}
              className={`
                relative inline-block max-w-full rounded-md p-1
                transition-colors
                hover:text-info
                ${textAlignClassName}
                ${nameClassName}
                ${nameDisplayClassName}
                after:absolute after:bottom-0 after:h-0.5 after:w-0
                after:rounded-full after:bg-info after:transition-all
                after:duration-200
                hover:after:w-full
                ${align === "center" ? `mx-auto` : ""}
                ${nameUnderlineClassName}
              `}
            >
              {displayValue || "未命名角色"}
            </button>
          )}
        />
      )}

      {supportingText
        ? (
            <p className={`
              text-sm text-base-content/60
              ${textAlignClassName}
            `}>
              {supportingText}
            </p>
          )
        : null}

      {showDescription && (isDescriptionEditing
        ? (
            <div className={descriptionEditorClassName}>
              <textarea
                value={descriptionDraft}
                onChange={event => setDescriptionDraft(event.target.value)}
                autoComplete="off"
                aria-label="角色描述"
                placeholder="一句话介绍角色"
                className={`
                  min-h-32 size-full resize-none rounded-md border
                  border-base-content/15 bg-base-100 p-2 text-sm transition
                  focus:border-info focus:outline-none focus:ring-2
                  focus:ring-info/20
                  ${textAlignClassName}
                  ${descriptionTextareaClassName}
                `}
                maxLength={maxDescriptionLength}
              />
              <p className="mt-1 text-xs text-base-content/50">
                用于角色简介，会随角色一起保存
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`
                  text-sm
                  ${descriptionCounterClassName}
                `}>
                  {descriptionLength}
                  /
                  {maxDescriptionLength}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="
                      rounded-md px-3 py-1.5 text-sm text-base-content/70
                      transition
                      hover:bg-base-200
                    "
                    onClick={handleDescriptionCancel}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="
                      rounded-md bg-info px-3 py-1.5 text-sm
                      text-info-content transition
                      hover:opacity-90
                    "
                    onClick={handleDescriptionSave}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )
        : (
            <button
              type="button"
              onClick={handleDescriptionStartEditing}
              className={`
                flex w-full items-start rounded-md px-2 transition
                hover:bg-base-200/80
                ${descriptionAlignClassName}
                ${textAlignClassName}
                ${descriptionButtonClassName}
              `}
            >
              <span className={descriptionDisplayClassName} title={descriptionTitle}>
                {localRole.description || "暂无描述"}
              </span>
            </button>
          ))}
    </div>
  );
}
