import type { Role } from "./types";
import { useEffect, useState } from "react";
import { DoubleClickEditableText } from "@/components/common/DoubleClickEditableText";

interface RoleBasicInfoEditorProps {
  localRole: Role;
  maxRoleNameLength: number;
  maxDescriptionLength: number;
  onBaseRoleSave: (updatedRole: Role) => void;
  supportingText?: string;
  align?: "left" | "center";
  className?: string;
  nameClassName?: string;
  nameDisplayClassName?: string;
  descriptionDisplayClassName?: string;
  descriptionButtonClassName?: string;
  descriptionEditorClassName?: string;
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
  descriptionDisplayClassName = "",
  descriptionButtonClassName = "",
  descriptionEditorClassName = "",
  showName = true,
  showDescription = true,
}: RoleBasicInfoEditorProps) {
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(localRole.description ?? "");

  useEffect(() => {
    if (isDescriptionEditing) {
      return;
    }
    setDescriptionDraft(localRole.description ?? "");
  }, [isDescriptionEditing, localRole.description]);

  const textAlignClassName = align === "center" ? "text-center" : "text-left";
  const nameUnderlineClassName = align === "center"
    ? "after:left-1/2 after:-translate-x-1/2 hover:after:w-10"
    : "after:left-0 after:translate-x-0 hover:after:w-12";
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

  const handleDescriptionSave = () => {
    const nextDescription = descriptionDraft;
    setIsDescriptionEditing(false);
    if (nextDescription === (localRole.description ?? "")) {
      return;
    }
    onBaseRoleSave({
      ...localRole,
      description: nextDescription,
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
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
              className={`relative w-full rounded-md px-1 py-1 transition-colors hover:text-primary ${textAlignClassName} ${nameClassName} ${nameDisplayClassName} after:absolute after:bottom-0 after:h-0.5 after:w-0 after:rounded-full after:bg-primary after:transition-all after:duration-200 ${nameUnderlineClassName}`}
            >
              {displayValue || "未命名角色"}
            </button>
          )}
        />
      )}

      {supportingText
        ? (
            <p className={`text-sm text-base-content/60 ${textAlignClassName}`}>
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
                placeholder="角色描述"
                className={`min-h-24 w-full resize-none rounded-md border border-base-content/15 bg-base-100 px-2 py-2 text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${textAlignClassName}`}
                maxLength={maxDescriptionLength}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`text-sm ${descriptionCounterClassName}`}>
                  {descriptionLength}
                  /
                  {maxDescriptionLength}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm text-base-content/70 transition hover:bg-base-200"
                    onClick={handleDescriptionCancel}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-content transition hover:opacity-90"
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
              onClick={() => setIsDescriptionEditing(true)}
              className={`w-full rounded-md px-2 py-2 transition hover:bg-base-200/80 ${textAlignClassName} ${descriptionDisplayClassName} ${descriptionButtonClassName}`}
            >
              {localRole.description || "暂无描述"}
            </button>
          ))}
    </div>
  );
}
