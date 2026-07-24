import {
  CheckCircleIcon,
  CircleNotchIcon,
  CloudArrowUpIcon,
  HardDriveIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { MediaImage } from "@/components/common/mediaImage";

import type { MessageEditorRoomSyncProgress, MessageEditorSaveState, MessageEditorTcHeader } from "./messageEditorTypes";

import {
  MESSAGE_EDITOR_CONTENT_WIDTH_CLASS,
  MESSAGE_EDITOR_HEADER_CONTENT_WIDTH_CLASS,
} from "./messageEditorLayout";

/** message editor 文档头部输入，由组件内部解析成展示状态。 */
export type MessageEditorHeaderProps = {
  coverUrl?: string;
  docId?: string;
  readOnly: boolean;
  ready: boolean;
  saveState: MessageEditorSaveState;
  roomDocumentSyncState?: "clean" | "syncing" | "error" | "ambiguous";
  roomDocumentSyncProgress?: MessageEditorRoomSyncProgress;
  onRequestClearDocument?: () => void;
  roomDocumentDeletedCount?: number;
  tcHeader?: MessageEditorTcHeader;
  title?: string;
}

/** message editor 文档头部最终展示状态。 */
export type MessageEditorHeaderState = {
  coverUrl: string;
  docId?: string;
  statusLabel: string;
  statusPhase: MessageEditorRoomSyncProgress["phase"];
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

function formatSyncDuration(durationMs: number | undefined) {
  if (durationMs === undefined) return "";
  return `${(Math.max(0, durationMs) / 1000).toFixed(1)} 秒`;
}

function getMessageEditorHeaderStatus(options: {
  now: number;
  readOnly: boolean;
  ready: boolean;
  saveState: MessageEditorSaveState;
  roomDocumentSyncProgress?: MessageEditorHeaderProps["roomDocumentSyncProgress"];
  roomDocumentSyncState?: MessageEditorHeaderProps["roomDocumentSyncState"];
}) {
  const progress = options.roomDocumentSyncProgress;
  const elapsed = formatSyncDuration(progress?.startedAt === undefined ? undefined : options.now - progress.startedAt);
  const local = formatSyncDuration(progress?.localDurationMs);
  const cloud = formatSyncDuration(progress?.cloudDurationMs);
  if (options.readOnly) {
    return { label: "只读", phase: "idle" as const };
  }
  if (!options.ready) {
    return { label: "载入中", phase: "idle" as const };
  }
  if (progress?.phase === "editing") {
    const background = progress.backgroundPhase === "localSaving"
      ? ` · 上一版本地保存中${elapsed ? ` ${elapsed}` : ""}`
      : progress.backgroundPhase === "cloudSaving"
        ? ` · 上一版同步中${elapsed ? ` ${elapsed}` : ""}`
        : "";
    return { label: `编辑中${background}`, phase: progress.phase };
  }
  if (progress?.phase === "localSaving") return { label: `正在保存到本地${elapsed ? ` · ${elapsed}` : ""}`, phase: progress.phase };
  if (progress?.phase === "localSaved") {
    const countdown = formatSyncDuration(progress.dueAt === undefined ? undefined : progress.dueAt - options.now);
    return { label: `已保存到本地${countdown ? ` · ${countdown}后同步` : ""}`, phase: progress.phase };
  }
  if (progress?.phase === "cloudSaving") return { label: `正在等待服务器确认${elapsed ? ` · ${elapsed}` : ""}`, phase: progress.phase };
  if (progress?.phase === "localFinalizing") return { label: `服务器已确认 · 正在更新本地${elapsed ? ` · ${elapsed}` : ""}`, phase: progress.phase };
  if (progress?.phase === "synced") {
    return { label: `已同步${local ? ` · 本地 ${local}` : ""}${cloud ? ` · 云端 ${cloud}` : ""}`, phase: progress.phase };
  }
  if (progress?.phase === "syncedLocalPending") {
    return { label: `已同步 · 本地缓存待补写${cloud ? ` · 云端 ${cloud}` : ""}`, phase: progress.phase };
  }
  if (progress?.phase === "retrying") {
    const retrySeconds = Math.max(0, Math.ceil(((progress.dueAt ?? options.now) - options.now) / 1000));
    return { label: `云端同步失败 · ${retrySeconds} 秒后重试`, phase: progress.phase };
  }
  if (progress?.phase === "reconciling") return { label: `正在核对服务器结果${elapsed ? ` · ${elapsed}` : ""}`, phase: progress.phase };
  if (progress?.phase === "ambiguous" || options.roomDocumentSyncState === "ambiguous") {
    return { label: "服务器结果待确认", phase: "ambiguous" as const };
  }
  if (progress?.phase === "error" || options.roomDocumentSyncState === "error") {
    return { label: "已保存到本地 · 云端同步失败", phase: "error" as const };
  }
  if (options.roomDocumentSyncState === "syncing") return { label: "编辑中", phase: "editing" as const };
  if (options.saveState === "saving") {
    return { label: "保存中", phase: "cloudSaving" as const };
  }
  if (options.saveState === "saved") {
    return { label: "已保存", phase: "synced" as const };
  }
  if (options.saveState === "error") {
    return { label: "未保存", phase: "error" as const };
  }
  if (options.saveState === "dirty") {
    return { label: "编辑中", phase: "editing" as const };
  }
  return { label: "已同步", phase: "idle" as const };
}

/**
 * 解析文档头部展示状态，避免主编辑器重复维护标题、封面和状态文案。
 */
export function resolveMessageEditorHeaderState(options: MessageEditorHeaderProps, now = Date.now()): MessageEditorHeaderState {
  const status = getMessageEditorHeaderStatus({
    now,
    readOnly: options.readOnly,
    ready: options.ready,
    saveState: options.saveState,
    roomDocumentSyncProgress: options.roomDocumentSyncProgress,
    roomDocumentSyncState: options.roomDocumentSyncState,
  });
  return {
    coverUrl: options.coverUrl || options.tcHeader?.fallbackImageUrl || "",
    docId: options.docId?.trim() || undefined,
    statusLabel: status.label,
    statusPhase: status.phase,
    title: options.title?.trim() || options.tcHeader?.fallbackTitle?.trim() || "消息",
  };
}

function useMessageEditorHeaderNow(progress: MessageEditorRoomSyncProgress | undefined) {
  const [now, setNow] = useState(() => Date.now());
  const running = progress?.phase === "localSaving"
    || progress?.phase === "localSaved"
    || progress?.phase === "cloudSaving"
    || progress?.phase === "localFinalizing"
    || progress?.phase === "retrying"
    || progress?.phase === "reconciling"
    || progress?.backgroundPhase !== undefined;
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [progress?.phase, progress?.startedAt, running]);
  return now;
}

function MessageEditorSyncStatus({ state }: { state: MessageEditorHeaderState }) {
  const isError = state.statusPhase === "error" || state.statusPhase === "ambiguous";
  const isBusy = state.statusPhase === "localSaving"
    || state.statusPhase === "cloudSaving"
    || state.statusPhase === "localFinalizing"
    || state.statusPhase === "reconciling";
  const StatusIcon = isError
    ? WarningCircleIcon
    : state.statusPhase === "synced" || state.statusPhase === "syncedLocalPending"
      ? CheckCircleIcon
      : state.statusPhase === "cloudSaving" || state.statusPhase === "retrying" || state.statusPhase === "reconciling"
        ? CloudArrowUpIcon
        : state.statusPhase === "localSaving" || state.statusPhase === "localSaved" || state.statusPhase === "editing" || state.statusPhase === "localFinalizing"
          ? HardDriveIcon
          : null;

  return (
    <div
      role={isError ? "status" : undefined}
      className={`
        flex min-h-7 w-full max-w-full items-center gap-1.5 rounded-md border
        px-2 py-1 text-xs sm:w-auto sm:shrink-0
        ${isError ? "border-error/30 bg-error/10 text-error" : "border-base-300 text-base-content/60"}
      `}
      title={state.statusLabel}
    >
      {isBusy
        ? <CircleNotchIcon aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-info motion-reduce:animate-none" />
        : StatusIcon
          ? <StatusIcon aria-hidden="true" className="size-3.5 shrink-0" weight={isError || state.statusPhase === "synced" ? "fill" : "regular"} />
          : null}
      <span className="min-w-0 whitespace-normal wrap-break-word sm:whitespace-nowrap">{state.statusLabel}</span>
    </div>
  );
}

/**
 * message editor 文档头部，内部负责解析标题、封面、文档 ID 和保存状态。
 */
export function MessageEditorHeader(props: MessageEditorHeaderProps) {
  const now = useMessageEditorHeaderNow(props.roomDocumentSyncProgress);
  const headerState = resolveMessageEditorHeaderState(props, now);

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
          flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center
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
          <MessageEditorSyncStatus state={headerState} />
        </div>
        {props.roomDocumentDeletedCount && props.roomDocumentDeletedCount > 0
          ? <div className="mt-2 text-xs text-error">本地待删除 {props.roomDocumentDeletedCount} 条消息</div>
          : null}
      </div>
    </>
  );
}

/**
 * 完整标题滚出编辑器视口后显示的紧凑状态条，不参与正文布局。
 */
export function MessageEditorFloatingHeader(props: MessageEditorFloatingHeaderProps) {
  const now = useMessageEditorHeaderNow(props.roomDocumentSyncProgress);
  const headerState = resolveMessageEditorHeaderState(props, now);

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
        flex min-w-0 flex-col items-start justify-between gap-2 rounded-md border
        border-base-300 bg-base-100/95 px-3 py-2 shadow-sm
        sm:flex-row sm:items-center
        supports-backdrop-filter:bg-base-100/90
        supports-backdrop-filter:backdrop-blur-sm
      `}>
        <div className="min-w-0 truncate text-sm font-semibold text-base-content" title={headerState.title}>
          {headerState.title}
        </div>
        <MessageEditorSyncStatus state={headerState} />
      </div>
    </div>
  );
}
