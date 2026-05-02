import type { SyntheticEvent } from "react";
import type { ChatMessageResponse, Room } from "../../../../api";

import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";

export type RenderableRoom = Room & { roomId: number };

export interface RoomRenderState {
  status: "idle" | "rendering" | "success" | "error";
  messageCount: number;
  errorMessage?: string;
}

export interface BatchProgress {
  current: number;
  total: number;
  roomName?: string;
}

export type CollapsibleSectionKey = "renderLayer" | "ttsLayer" | "gameLayer" | "workflowLayer";
export type SpaceWebgalSettingsTab = "render" | "roomContent";

export const DEFAULT_SECTION_EXPANDED: Record<CollapsibleSectionKey, boolean> = {
  renderLayer: true,
  ttsLayer: true,
  gameLayer: true,
  workflowLayer: false,
};

export const COLLAPSIBLE_SECTION_KEYS: CollapsibleSectionKey[] = [
  "workflowLayer",
  "renderLayer",
  "ttsLayer",
  "gameLayer",
];

export const DEFAULT_LANGUAGE_OPTIONS = [
  { value: "", label: "不设定" },
  { value: "zh_CN", label: "简体中文" },
  { value: "zh_TW", label: "繁体中文" },
  { value: "en", label: "英语" },
  { value: "ja", label: "日语" },
  { value: "fr", label: "法语" },
  { value: "de", label: "德语" },
] as const;

export const BASE_TEMPLATE_OPTIONS = [
  { value: "none", label: "无（默认）" },
  { value: "black", label: "Black" },
] as const;

export function isRenderableRoom(room: Room): room is RenderableRoom {
  return typeof room.roomId === "number"
    && Number.isFinite(room.roomId)
    && room.roomId > 0
    && room.status !== 1;
}

export function extractArrayPayload<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  const data = (value as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === "object") {
    const list = (data as { list?: unknown }).list;
    if (Array.isArray(list)) {
      return list as T[];
    }
  }
  return [];
}

export function sortMessagesForRender(messages: ChatMessageResponse[]): ChatMessageResponse[] {
  return [...messages].sort(compareChatMessageResponsesByOrder);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "未知错误";
}

export function buildStatusMeta(status: "idle" | "initializing" | "connected" | "disconnected" | "error") {
  if (status === "connected") {
    return { label: "已连接", badgeClass: "badge-success" };
  }
  if (status === "initializing") {
    return { label: "初始化中", badgeClass: "badge-info" };
  }
  if (status === "disconnected") {
    return { label: "连接断开", badgeClass: "badge-warning" };
  }
  if (status === "error") {
    return { label: "连接失败", badgeClass: "badge-error" };
  }
  return { label: "未启动", badgeClass: "badge-ghost" };
}

export function buildRoomStatusMeta(status: RoomRenderState["status"]) {
  if (status === "success") {
    return { label: "完成", badgeClass: "badge-success" };
  }
  if (status === "rendering") {
    return { label: "渲染中", badgeClass: "badge-info" };
  }
  if (status === "error") {
    return { label: "失败", badgeClass: "badge-error" };
  }
  return { label: "未渲染", badgeClass: "badge-ghost" };
}

export function SectionCollapseToggle({
  expanded,
  onClick,
  label,
}: {
  expanded: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="h-8 w-8 rounded-md flex items-center justify-center text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
      title={expanded ? `收起${label}` : `展开${label}`}
      aria-label={expanded ? `收起${label}` : `展开${label}`}
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 transition-transform duration-200 ${expanded ? "-rotate-90" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 5-7 7 7 7" />
      </svg>
    </button>
  );
}

export function ConfigHelpButton({ label, description }: { label: string; description: string }) {
  const stopLabelToggle = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <span className="tooltip tooltip-top z-20" data-tip={description}>
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-base-content/50 transition-colors hover:bg-info/15 hover:text-info focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-info/60"
        title={description}
        aria-label={`${label}说明：${description}`}
        onClick={stopLabelToggle}
        onPointerDown={stopLabelToggle}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 11v5"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </button>
    </span>
  );
}

export function ConfigItemLabel({ label, description }: { label: string; description: string }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      <span>{label}</span>
      <ConfigHelpButton label={label} description={description} />
    </span>
  );
}
