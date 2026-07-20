import { MediaImage } from "@/components/common/mediaImage";

import type { MessageEditorSaveState, MessageEditorTcHeader } from "../messageEditorTypes";

import {
  MESSAGE_EDITOR_CONTENT_WIDTH_CLASS,
  MESSAGE_EDITOR_HEADER_CONTENT_WIDTH_CLASS,
} from "../messageEditorLayout";

/** message editor 文档头部输入，由组件内部解析成展示状态。 */
export type MessageEditorHeaderProps = {
  coverUrl?: string;
  docId?: string;
  readOnly: boolean;
  ready: boolean;
  saveState: MessageEditorSaveState;
  tcHeader?: MessageEditorTcHeader;
  title?: string;
}

/** message editor 文档头部最终展示状态。 */
export type MessageEditorHeaderState = {
  coverUrl: string;
  docId?: string;
  statusLabel: string;
  title: string;
}

export type MessageEditorFloatingHeaderProps = MessageEditorHeaderProps & {
  visible: boolean;
}

export function shouldShowMessageEditorFloatingHeader(input: {
  isIntersecting: boolean;
  markerTop: number;
  viewportTop: number;
}) {
  return !input.isIntersecting && input.markerTop < input.viewportTop;
}

function getMessageEditorHeaderStatusLabel(options: {
  readOnly: boolean;
  ready: boolean;
  saveState: MessageEditorSaveState;
}) {
  if (options.readOnly) {
    return "只读";
  }
  if (!options.ready) {
    return "载入中";
  }
  if (options.saveState === "saving") {
    return "保存中";
  }
  if (options.saveState === "saved") {
    return "已保存";
  }
  if (options.saveState === "error") {
    return "未保存";
  }
  if (options.saveState === "dirty") {
    return "编辑中";
  }
  return "已保存";
}

/**
 * 解析文档头部展示状态，避免主编辑器重复维护标题、封面和状态文案。
 */
export function resolveMessageEditorHeaderState(options: MessageEditorHeaderProps): MessageEditorHeaderState {
  return {
    coverUrl: options.coverUrl || options.tcHeader?.fallbackImageUrl || "",
    docId: options.docId?.trim() || undefined,
    statusLabel: getMessageEditorHeaderStatusLabel({
      readOnly: options.readOnly,
      ready: options.ready,
      saveState: options.saveState,
    }),
    title: options.title?.trim() || options.tcHeader?.fallbackTitle?.trim() || "消息",
  };
}

/**
 * message editor 文档头部，内部负责解析标题、封面、文档 ID 和保存状态。
 */
export function MessageEditorHeader(props: MessageEditorHeaderProps) {
  const headerState = resolveMessageEditorHeaderState(props);

  return (
    <>
      {headerState.coverUrl
        ? (
            <div className="
              h-40 w-full shrink-0 overflow-hidden border-b border-base-300
              bg-base-200
            ">
              <MediaImage className="h-full w-full object-cover" src={headerState.coverUrl} alt={headerState.title} />
            </div>
          )
        : null}

      <div className="border-b border-base-300 pb-4 pt-6">
        <div className={`
          ${MESSAGE_EDITOR_HEADER_CONTENT_WIDTH_CLASS}
          flex items-center justify-between gap-4
        `}>
          <div className="min-w-0">
            <div className="
              truncate text-lg font-semibold text-base-content
              md:text-xl
            ">{headerState.title}</div>
            {headerState.docId
              ? (
                  <div className="
                    truncate font-mono text-xs text-base-content/50
                  ">
                    {headerState.docId}
                  </div>
                )
              : null}
          </div>
          <div className="
            rounded-md border border-base-300 px-2 py-1 text-xs
            text-base-content/55
          ">
            {headerState.statusLabel}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * 完整标题滚出编辑器视口后显示的紧凑状态条，不参与正文布局。
 */
export function MessageEditorFloatingHeader(props: MessageEditorFloatingHeaderProps) {
  const headerState = resolveMessageEditorHeaderState(props);

  return (
    <div
      aria-hidden={!props.visible}
      data-me-floating-header="true"
      className={`
        pointer-events-none absolute inset-x-0 top-2 z-40 px-2
        transition-[opacity,transform] duration-150 motion-reduce:transition-none
        ${props.visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"}
      `}
    >
      <div className={`
        ${MESSAGE_EDITOR_CONTENT_WIDTH_CLASS}
        flex min-w-0 items-center justify-between gap-3 rounded-md border
        border-base-300 bg-base-100/95 px-3 py-2 shadow-sm
        supports-[backdrop-filter]:bg-base-100/90
        supports-[backdrop-filter]:backdrop-blur-sm
      `}>
        <div className="min-w-0 truncate text-sm font-semibold text-base-content" title={headerState.title}>
          {headerState.title}
        </div>
        <div className="shrink-0 text-xs text-base-content/60">
          {headerState.statusLabel}
        </div>
      </div>
    </div>
  );
}
