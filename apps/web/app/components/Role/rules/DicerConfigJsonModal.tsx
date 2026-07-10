import { useEffect, useRef, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { useEscapeToClose } from "@/components/common/customHooks/useEscapeToClose";

type DicerConfigJsonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  copywritingTemplates: Record<string, string[]> | undefined;
  onReset: () => void;
  onSave: (data: Record<string, string[]>) => void;
}

/**
 * 骰娘配置JSON模态框
 * 用于展示、编辑、复制和重置骰娘文案配置的JSON数据
 */
export default function DicerConfigJsonModal({
  isOpen,
  onClose,
  copywritingTemplates,
  onReset,
  onSave,
}: DicerConfigJsonModalProps) {
  const [jsonText, setJsonText] = useState<string>("");
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [jsonError, setJsonError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const resetConfirmDialogRef = useRef<HTMLDialogElement | null>(null);

  // 大小限制配置（可根据需要调整数值）
  const MAX_KEY_LENGTH = 50; // 分组键最大长度
  const MAX_ITEM_LENGTH = 300; // 每条文案最大长度
  const MAX_TOTAL_SIZE = 20000; // JSON整体最大字符数（字符串长度）
  const MAX_ITEMS_PER_GROUP = 100; // 每组最大条目数
  const JSON_CONFIG_HELP_ID = "dicer-config-json-help";
  const JSON_CONFIG_ERROR_ID = "dicer-config-json-error";

  // 当 copywritingTemplates 更新时，生成易读的 JSON
  useEffect(() => {
    if (copywritingTemplates) {
      try {
        const formatted = JSON.stringify(copywritingTemplates, null, 2);
        queueMicrotask(() => setJsonText(formatted));
        queueMicrotask(() => setIsEdited(false));
        queueMicrotask(() => setJsonError(""));
      }
      catch (e) {
        console.error("解析骰娘配置JSON失败", e);
        queueMicrotask(() => setJsonText("无法解析配置数据"));
      }
    }
    else {
      queueMicrotask(() => setJsonText("{}"));
      queueMicrotask(() => setIsEdited(false));
      queueMicrotask(() => setJsonError(""));
    }
  }, [copywritingTemplates, isOpen]);

  // 处理 JSON 文本变化
  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setIsEdited(true);
    setJsonError("");
  };

  // 验证并保存 JSON
  const handleSave = async () => {
    try {
      // 验证 JSON 语法
      const parsed = JSON.parse(jsonText);

      // 验证数据结构
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("配置必须是一个对象");
        return;
      }

      // 验证每个字段是否为字符串数组
      for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value)) {
          setJsonError(`字段 "${key}" 必须是数组`);
          return;
        }
        if (!value.every(item => typeof item === "string")) {
          setJsonError(`字段 "${key}" 中必须只包含字符串`);
          return;
        }

        // 键名大小限制
        if (typeof key !== "string" || key.trim().length === 0) {
          setJsonError("分组键不能为空字符串");
          return;
        }
        if (key.length > MAX_KEY_LENGTH) {
          setJsonError(`分组键 "${key}" 过长，最多 ${MAX_KEY_LENGTH} 字符`);
          return;
        }

        // 每组数量限制
        if (value.length > MAX_ITEMS_PER_GROUP) {
          setJsonError(`分组 "${key}" 的条目过多，最多 ${MAX_ITEMS_PER_GROUP} 条`);
          return;
        }

        // 每条文案非空与长度限制
        for (const [idx, item] of value.entries()) {
          const trimmed = item.trim();
          if (trimmed.length === 0) {
            setJsonError(`分组 "${key}" 中第 ${idx + 1} 条文案为空，请填写内容`);
            return;
          }
          if (trimmed.length > MAX_ITEM_LENGTH) {
            setJsonError(`分组 "${key}" 中第 ${idx + 1} 条文案过长，最多 ${MAX_ITEM_LENGTH} 字符`);
            return;
          }
        }
      }

      // 整体大小限制（按字符串长度衡量）
      const totalSize = JSON.stringify(parsed).length;
      if (totalSize > MAX_TOTAL_SIZE) {
        setJsonError(`配置整体过大（${totalSize}），最多 ${MAX_TOTAL_SIZE} 字符`);
        return;
      }

      // 保存数据
      setIsSaving(true);
      await onSave(parsed as Record<string, string[]>);
      setIsSaving(false);
      setIsEdited(false);
      appToast.success("骰娘文案配置已保存");
    }
    catch (e) {
      if (e instanceof SyntaxError) {
        setJsonError(`JSON 语法错误: ${e.message}`);
        appToast.error({
          title: "JSON 配置格式有误",
          description: "请修正语法后再保存。",
        });
      }
      else {
        const message = e instanceof Error && e.message ? e.message : "请检查配置内容后重试";
        setJsonError(`保存失败：${message}`);
        appToast.error({
          title: "骰娘文案配置保存失败",
          description: message,
        });
      }
      setIsSaving(false);
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      appToast.success("JSON 配置已复制");
    }
    catch (err) {
      const message = err instanceof Error && err.message ? err.message : "浏览器未允许访问剪贴板";
      appToast.error({
        title: "复制 JSON 配置失败",
        description: `${message}。请手动选中内容复制。`,
      });
    }
  };

  // 处理重置
  const handleReset = () => {
    setShowResetConfirm(true);
  };

  // 确认重置
  const confirmReset = () => {
    onReset();
    setShowResetConfirm(false);
  };

  useEscapeToClose({
    enabled: isOpen,
    onClose,
    containerRef: dialogRef,
  });

  useEscapeToClose({
    enabled: showResetConfirm,
    onClose: () => setShowResetConfirm(false),
    containerRef: resetConfirmDialogRef,
  });

  if (!isOpen)
    return null;

  return (
    <dialog
      ref={dialogRef}
      data-modal-layer="true"
      role="dialog"
      aria-modal="true"
      aria-label="骰娘文案配置 JSON"
      className="modal modal-open"
    >
      <div className="modal-box max-w-3xl">
        {/* 关闭按钮 */}
        <form method="dialog">
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            aria-label="关闭骰子 JSON 配置"
            onClick={onClose}
          >
            ✕
          </button>
        </form>

        {/* 标题 */}
        <h3 className="font-bold text-lg mb-4">骰娘文案配置 JSON</h3>

        {/* JSON 编辑区域 */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium" htmlFor="dicer-config-json-textarea">
            JSON 配置
          </label>
          <p id={JSON_CONFIG_HELP_ID} className="mb-2 text-xs text-base-content/60">
            请输入合法 JSON；保存失败时会在下方提示具体原因。
          </p>
          <textarea
            id="dicer-config-json-textarea"
            value={jsonText}
            autoComplete="off"
            aria-describedby={jsonError ? `${JSON_CONFIG_HELP_ID} ${JSON_CONFIG_ERROR_ID}` : JSON_CONFIG_HELP_ID}
            onChange={e => handleJsonChange(e.target.value)}
            className={`
              textarea textarea-bordered w-full h-96 font-mono text-sm
              resize-none
              ${
              jsonError ? "textarea-error" : ""
            }
            `}
            placeholder="输入 JSON 配置"
            spellCheck={false}
          />
          {jsonError && (
            <div className="label">
              <span id={JSON_CONFIG_ERROR_ID} role="alert" className="label-text-alt text-error">{jsonError}</span>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="modal-action">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-warning btn-sm"
            disabled={isSaving}
            title="还原默认配置，会覆盖当前编辑"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重置
          </button>
          <button
            type="button"
            onClick={handleCopyToClipboard}
            className="btn btn-ghost btn-sm"
            disabled={isSaving}
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            复制
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            disabled={isSaving}
          >
            取消
          </button>
          {isEdited && (
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              aria-busy={isSaving}
              disabled={isSaving}
            >
              {isSaving
                ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      保存中...
                    </>
                  )
                : (
                    <>
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      保存
                    </>
                  )}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button
          type="button"
          onClick={onClose}
        >
          close
        </button>
      </form>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <dialog
          ref={resetConfirmDialogRef}
          data-modal-layer="true"
          role="dialog"
          aria-modal="true"
          aria-label="确认重置骰娘配置"
          className="modal modal-open"
        >
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">确认重置</h3>
            <p className="py-4">确认要还原默认配置吗？此操作不可撤销。</p>
            <div className="modal-action">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-ghost"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="btn btn-warning"
              >
                确认重置
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
            >
              close
            </button>
          </form>
        </dialog>
      )}
    </dialog>
  );
}
