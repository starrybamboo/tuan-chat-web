import type { FocusEvent, KeyboardEvent } from "react";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import {
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "api/hooks/abilityQueryHooks";

import { buildRoleAbilityFieldKeyPayload, buildRoleAbilitySectionUpdatePayload } from "./roleAbilityFieldPayload";

type PerformanceEditorProps = {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  roleId: number;
  ruleId: number;
  hideTitleOnMobile?: boolean;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "请稍后重试";
}

const tableCellClassName = `
  border border-base-content/10 p-0 align-middle font-normal
`;

const tableControlClassName = `
  block h-11 min-h-11 w-full appearance-none border-0 bg-transparent
  px-3 text-center leading-[2.75rem] outline-none
  placeholder:text-base-content/35 focus:bg-info/10 focus:ring-2 focus:ring-info/30
`;

const tableTextareaClassName = `
  block min-h-11 w-full resize-none appearance-none overflow-hidden border-0
  bg-transparent px-3 py-3 text-center leading-5 outline-none
  [overflow-wrap:anywhere] placeholder:text-base-content/35 focus:bg-info/10 focus:ring-2 focus:ring-info/30
`;

const TABLE_TEXTAREA_MIN_HEIGHT = 44;

function resizeTableTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = `${TABLE_TEXTAREA_MIN_HEIGHT}px`;
  textarea.style.height = `${Math.max(TABLE_TEXTAREA_MIN_HEIGHT, textarea.scrollHeight)}px`;
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 展示方式被划分为了 短字段、长字段和携带物品 三种不同的展示方式
 */
export default function PerformanceEditor({
  fields,
  onChange,
  abilityData: _abilityData,
  roleId,
  ruleId,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFieldValue, mutateAsync: updateFieldValueAsync } = useUpdateRoleAbilityByRoleIdMutation();
  const { mutateAsync: updateKeyFieldAsync } = useUpdateKeyFieldByRoleIdMutation();
  const pendingChangesRef = useRef<Record<string, string>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const [localFields, setLocalFields] = useState(fields);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");
  const [addKeyDraft, setAddKeyDraft] = useState("");
  const [addValueDraft, setAddValueDraft] = useState("");
  const longFieldKeys = [""];
  const shortFields = Object.keys(localFields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  useEffect(() => {
    pendingChangesRef.current = {};
    setLocalFields(fields);
    setEditingKey(null);
    setTempFieldKey("");
    setAddKeyDraft("");
    setAddValueDraft("");
  }, [fields, roleId, ruleId]);

  useLayoutEffect(() => {
    const textareas = tableRef.current?.querySelectorAll<HTMLTextAreaElement>("[data-table-textarea=\"true\"]");
    textareas?.forEach(resizeTableTextarea);
  }, [localFields, addValueDraft]);

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
    const nextFields = { ...localFields };
    delete nextFields[key];
    pendingChangesRef.current = {};

    try {
      if (Object.keys(pendingChanges).length > 0) {
        await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", pendingChanges));
      }
      await updateKeyFieldAsync(buildRoleAbilityFieldKeyPayload(roleId, ruleId, "act", {
        [key]: null,
      }));
      setLocalFields(nextFields);
      onChange(nextFields);
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
      return false;

    const pendingChanges = pendingChangesRef.current;
    const nextFields = { ...localFields, ...pendingChanges, [nextKey]: value };
    pendingChangesRef.current = {};

    try {
      await updateFieldValueAsync(buildRoleAbilitySectionUpdatePayload(roleId, ruleId, "act", {
        ...pendingChanges,
        [nextKey]: value,
      }));
      setLocalFields(nextFields);
      onChange(nextFields);
      return true;
    }
    catch (error) {
      pendingChangesRef.current = {
        ...pendingChanges,
        ...pendingChangesRef.current,
      };
      restoreFieldsAfterError(error);
      return false;
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
    const nextFields = {
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
          onChange(nextFields);
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

  const commitRename = (oldKey: string) => {
    const nextKey = tempFieldKey.trim();
    if (!nextKey || nextKey === oldKey) {
      setEditingKey(null);
      return;
    }
    if (nextKey in localFields) {
      toast.error("字段名已存在");
      return;
    }
    handleRename(oldKey, nextKey);
    setEditingKey(null);
  };

  const handleAddDraftField = () => {
    void saveAddDraftField();
  };

  const saveAddDraftField = async () => {
    const nextKey = addKeyDraft.trim();
    if (!nextKey) {
      return;
    }
    if (nextKey in localFields) {
      toast.error("字段名已存在");
      return;
    }
    const didSave = await handleAddField(nextKey, addValueDraft);
    if (didSave) {
      setAddKeyDraft("");
      setAddValueDraft("");
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
    <div className="
      space-y-4 rounded-xl bg-base-200/45 p-3 contain-[layout_paint]
      [overflow-anchor:none]
    ">
      <div
        className="
          overflow-hidden rounded-xl border border-base-content/12
          bg-base-100/45
        "
        onBlur={handleGridBlur}
        onKeyDown={handleArrowNavigation}
      >
        <div ref={tableRef} className="overflow-x-auto">
          <table className="table-fixed border-collapse w-full min-w-[640px] text-sm">
            <colgroup>
              <col className="w-36 md:w-44" />
              <col />
            </colgroup>
            <tbody>
              {shortFields.map((key, index) => (
                <tr
                  key={key}
                  className={index % 2 === 0 ? "bg-base-100/35" : "bg-base-200/30"}
                >
                  <th className={`${tableCellClassName} text-base-content/90`}>
                    <div className="
                      group/field-key relative min-h-11
                      focus-within:bg-info/10 hover:bg-info/10
                    ">
                      <input
                        type="text"
                        autoComplete="off"
                        value={editingKey === key ? tempFieldKey : key}
                        onFocus={() => {
                          setEditingKey(key);
                          setTempFieldKey(key);
                        }}
                        onChange={e => setTempFieldKey(e.currentTarget.value)}
                        onBlur={() => {
                          if (editingKey === key) {
                            commitRename(key);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename(key);
                          }
                          if (e.key === "Escape") {
                            setTempFieldKey(key);
                            setEditingKey(null);
                          }
                        }}
                        data-arrow-nav-control="true"
                        title="编辑字段名"
                        className={`${tableControlClassName} px-8 hover:text-info`}
                      />
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleDeleteField(key)}
                        className="
                          btn btn-ghost btn-xs absolute right-2 top-1/2
                          size-6 min-h-6 -translate-y-1/2 p-0
                          text-base-content/50 opacity-0 transition
                          hover:bg-error/10 hover:text-error
                          group-hover/field-key:opacity-100
                          focus-visible:opacity-100
                        "
                        title="删除字段"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                  <td className={tableCellClassName}>
                    <textarea
                      rows={1}
                      className={tableTextareaClassName}
                      autoComplete="off"
                      aria-label="表演描述"
                      placeholder="请输入表演描述..."
                      value={localFields[key] === "0" ? "" : String(localFields[key] ?? "")}
                      onChange={(e) => {
                        resizeTableTextarea(e.currentTarget);
                        handleValueChange(key, e.currentTarget.value);
                      }}
                      data-arrow-nav-control="true"
                      data-table-textarea="true"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-base-100/25">
                <th className={tableCellClassName}>
                  <input
                    type="text"
                    autoComplete="off"
                    aria-label="新增字段名"
                    value={addKeyDraft}
                    onChange={e => setAddKeyDraft(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDraftField();
                      }
                    }}
                    data-arrow-nav-control="true"
                    placeholder="新增字段名"
                    className={tableControlClassName}
                  />
                </th>
                <td className={`${tableCellClassName} relative`}>
                  <textarea
                    rows={1}
                    autoComplete="off"
                    aria-label="新增表演描述"
                    value={addValueDraft}
                    onChange={(e) => {
                      resizeTableTextarea(e.currentTarget);
                      setAddValueDraft(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) {
                        e.preventDefault();
                        handleAddDraftField();
                      }
                    }}
                    data-arrow-nav-control="true"
                    data-table-textarea="true"
                    placeholder="新增字段内容"
                    className={`${tableTextareaClassName} px-11`}
                  />
                  <button
                    type="button"
                    onClick={handleAddDraftField}
                    disabled={!addKeyDraft.trim()}
                    className="
                      btn btn-primary btn-xs absolute right-2 top-1/2
                      -translate-y-1/2
                      size-6 min-h-6 p-0
                    "
                    title="添加字段"
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
