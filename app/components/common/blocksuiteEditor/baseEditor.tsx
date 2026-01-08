import type { BlocksuiteEditorHandles, BlocksuiteEditorOptions, BlocksuiteEditorStatus } from "./types";
import clsx from "clsx";
import React, { useId, useImperativeHandle, useMemo } from "react";
import { useBlocksuiteEditor } from "./hooks/useBlocksuiteEditor";

export interface BaseEditorRef {
  getHandles: () => BlocksuiteEditorHandles | null;
  reload: () => void;
}

interface BaseEditorProps extends BlocksuiteEditorOptions {
  className?: string;

  /**
   * 视觉外观：保持当前“纸张”形态为默认。
   */
  variant?: "paper" | "plain";

  /** 宿主高度控制：默认 320px，避免父容器未给高度时塌陷 */
  height?: number | string;
  /** 宿主最小高度：默认 240px */
  minHeight?: number | string;

  /** 是否隐藏默认页面标题区域（默认 true，嵌入式更干净） */
  hideTitle?: boolean;
  /** 是否隐藏默认 Page info 区域（默认 true） */
  hidePageInfo?: boolean;
  /**
   * 当需要自定义空状态文案时传入，默认显示加载/错误提示。
   */
  emptyHint?: string;
}

const statusHint: Record<BlocksuiteEditorStatus, string> = {
  idle: "",
  loading: "正在初始化富文本编辑器...",
  ready: "",
  error: "编辑器初始化失败，请稍后重试。",
};

function BaseEditor(props: BaseEditorProps & { ref?: React.Ref<BaseEditorRef> }) {
  const {
    className,
    emptyHint,
    variant = "paper",
    height = 320,
    minHeight = 240,
    hideTitle = true,
    hidePageInfo = true,
    ref,
    ...options
  } = props;
  const { hostRef, status, error, handlesRef, reload } = useBlocksuiteEditor(options);
  const scopeId = useId();

  useImperativeHandle(ref, () => ({
    getHandles: () => handlesRef.current,
    reload,
  }), [handlesRef, reload]);

  const hostStyle = useMemo(() => {
    const toCssSize = (value: number | string) => typeof value === "number" ? `${value}px` : value;
    return {
      "height": toCssSize(height),
      "minHeight": toCssSize(minHeight),
      // 让 blocksuite 的页面宽度跟随“纸张”容器
      "--affine-editor-width": "100%",
      "--affine-editor-side-padding": "0px",
    } as React.CSSProperties;
  }, [height, minHeight]);

  const scopedCss = useMemo(() => {
    let css = "";

    if (hideTitle) {
      css += `
[data-bs-editor-scope="${scopeId}"] .affine-doc-page-block-title-container {
  display: none !important;
}
[data-bs-editor-scope="${scopeId}"] [data-block-is-title="true"] {
  display: none !important;
}
`;
    }

    if (hidePageInfo) {
      css += `
[data-bs-editor-scope="${scopeId}"] affine-page-meta-data {
  display: none !important;
}
`;
    }

    return css;
  }, [hidePageInfo, hideTitle, scopeId]);

  const hintText = status === "error" && error ? error.message : statusHint[status] || emptyHint || "";
  const showHint = status !== "ready" && hintText.trim().length > 0;

  return (
    <div
      data-bs-editor-scope={scopeId}
      className={clsx("relative flex w-full flex-col", className)}
    >
      {scopedCss.length > 0 && <style>{scopedCss}</style>}

      {variant === "paper"
        ? (
            <div className="w-full rounded-lg border border-base-300 bg-base-100">
              <div className="bg-base-200 p-3">
                <div className="mx-auto w-full max-w-3xl rounded-md bg-base-100 p-4">
                  <div ref={hostRef} className="w-full" style={hostStyle} />
                </div>
              </div>
            </div>
          )
        : (
            <div className="w-full">
              <div ref={hostRef} className="w-full" style={hostStyle} />
            </div>
          )}

      {showHint && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-base-content/60">
          <span>{hintText}</span>
        </div>
      )}
    </div>
  );
}

export default BaseEditor;
