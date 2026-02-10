import { useEffect, useRef, useState } from "react";

const RULE_NAME_MAX_LENGTH = 20;
const RULE_DESCRIPTION_MAX_LENGTH = 200;

export default function RuleTextInfoEditor({
  ruleName,
  ruleDescription,
  onApply,
  cloneVersion,
  onEditingChange,
  forcedEditing,
  saveSignal,
}: {
  ruleName?: string;
  ruleDescription?: string;
  onApply: (next: { ruleName: string; ruleDescription: string }) => void;
  cloneVersion: number;
  onEditingChange?: (editing: boolean) => void;
  forcedEditing?: boolean;
  saveSignal?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localName, setLocalName] = useState(ruleName ?? "");
  const [localDescription, setLocalDescription] = useState(ruleDescription ?? "");
  const isForcedEditingMode = typeof forcedEditing === "boolean";
  const prevCloneVersionRef = useRef(cloneVersion);
  const prevSaveSignalRef = useRef<number | undefined>(saveSignal);

  // 非编辑态总是同步；受控编辑态下也允许外部同步（用于创建时模板预填）
  useEffect(() => {
    if (!isEditing || isForcedEditingMode) {
      setLocalName(ruleName ?? "");
      setLocalDescription(ruleDescription ?? "");
    }
  }, [isEditing, isForcedEditingMode, ruleDescription, ruleName]);

  // 将编辑态变化上报给父组件，用于保存前校验
  useEffect(() => {
    onEditingChange?.(isEditing);
  }, [isEditing, onEditingChange]);

  // 组件卸载时清理编辑态（例如切换 Tab/页面时避免残留）
  useEffect(() => {
    return () => {
      onEditingChange?.(false);
    };
  }, [onEditingChange]);

  // 导入（cloneVersion 变化）时：重置本地编辑内容，并退出编辑态（与右侧模块一致）
  useEffect(() => {
    if (cloneVersion === prevCloneVersionRef.current) {
      return;
    }

    prevCloneVersionRef.current = cloneVersion;
    setLocalName(ruleName ?? "");
    setLocalDescription(ruleDescription ?? "");
    setIsEditing(false);
  }, [cloneVersion, ruleDescription, ruleName]);

  useEffect(() => {
    if (typeof forcedEditing !== "boolean") {
      return;
    }

    if (forcedEditing) {
      setIsEditing(true);
      return;
    }

    setIsEditing(false);
  }, [forcedEditing]);

  useEffect(() => {
    if (saveSignal === undefined) {
      return;
    }
    if (prevSaveSignalRef.current === saveSignal) {
      return;
    }

    prevSaveSignalRef.current = saveSignal;
    if (!isEditing) {
      return;
    }

    onApply({ ruleName: localName, ruleDescription: localDescription });
    setIsEditing(false);
  }, [isEditing, localDescription, localName, onApply, saveSignal]);

  const handleStartEditing = () => {
    setLocalName(ruleName ?? "");
    setLocalDescription(ruleDescription ?? "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setLocalName(ruleName ?? "");
    setLocalDescription(ruleDescription ?? "");
    setIsEditing(false);
  };

  const handleApply = () => {
    onApply({ ruleName: localName, ruleDescription: localDescription });
    setIsEditing(false);
  };

  const nameLength = localName.length;
  const descriptionLength = localDescription.length;
  const nameCounterClass = nameLength >= RULE_NAME_MAX_LENGTH ? "text-error" : "text-base-content/50";
  const descriptionCounterClass = descriptionLength >= RULE_DESCRIPTION_MAX_LENGTH ? "text-error" : "text-base-content/50";

  return (
    <div className="space-y-6 min-h-[480px] md:min-h-[560px]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-base md:text-lg min-w-0 truncate">📘规则信息</h3>
        <div className="shrink-0">
          {typeof forcedEditing !== "boolean" && (
            <button
              type="button"
              className={`btn btn-sm btn-accent ${isEditing ? "invisible pointer-events-none" : ""}`}
              onClick={handleStartEditing}
              disabled={isEditing}
              tabIndex={isEditing ? -1 : 0}
              aria-hidden={isEditing}
            >
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                  <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                </svg>
                编辑
              </span>
            </button>
          )}
        </div>
      </div>
      <div className="divider my-0" />

      {!isEditing
        ? (
          // 非编辑态：展示模式
            <div className="space-y-4">
              {/* 规则名称展示 */}
              <div>
                <div className="flex gap-2 mb-3 items-center">
                  <span className="font-semibold">规则名称</span>
                </div>
                <div className="text-sm text-base-content/70 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap wrap-break-words">
                  {ruleName || <span className="text-base-content/40">未命名规则</span>}
                </div>
              </div>

              <div className="divider my-1" />

              {/* 规则描述展示 */}
              <div>
                <div className="flex gap-2 mb-3 items-center">
                  <span className="font-semibold">规则描述</span>
                </div>
                <div className="text-sm text-base-content/70 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap wrap-break-words">
                  {ruleDescription || <span className="text-base-content/40">暂无描述</span>}
                </div>
              </div>
            </div>
          )
        : (
          // 编辑态：表单控件
            <div className="space-y-4">
              <div className="form-control flex-1 min-w-0">
                <div className="flex gap-2 items-center font-semibold justify-between">
                  <span>规则名称</span>
                  <span className={`text-xs font-normal ${nameCounterClass}`}>
                    {nameLength}
                    /
                    {RULE_NAME_MAX_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  className="input input-bordered bg-base-100 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="输入规则名称"
                  value={localName}
                  maxLength={RULE_NAME_MAX_LENGTH}
                  onChange={(e) => {
                    setLocalName(e.target.value);
                  }}
                />
              </div>

              <div className="divider my-1" />

              <div className="form-control">
                <div className="flex gap-2 mb-2 items-center font-semibold justify-between">
                  <span>规则描述</span>
                  <span className={`text-xs font-normal ${descriptionCounterClass}`}>
                    {descriptionLength}
                    /
                    {RULE_DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  className="textarea textarea-bordered bg-base-100 rounded-md h-40 overflow-y-auto resize-none w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="输入规则描述"
                  value={localDescription}
                  maxLength={RULE_DESCRIPTION_MAX_LENGTH}
                  onChange={(e) => {
                    setLocalDescription(e.target.value);
                  }}
                />
              </div>
            </div>
          )}

      {isEditing && typeof forcedEditing !== "boolean" && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleApply}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              应用
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
