import type { DocMode } from "@blocksuite/affine/model";
import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/docHeader";

export interface BlocksuiteDescriptionEditorProps {
  workspaceId: string;
  spaceId?: number;
  docId: string;
  instanceId?: string;
  /** 已废弃：当前 route 方案不再执行临场 prewarm，这个入参仅为兼容保留。 */
  intentPrewarm?: boolean;
  variant?: "embedded" | "full";
  readOnly?: boolean;
  mode?: DocMode;
  allowModeSwitch?: boolean;
  fullscreenEdgeless?: boolean;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
  };
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  onModeChange?: (mode: DocMode) => void;
  onNavigate?: (to: string) => boolean | void;
  className?: string;
}

export function normalizeAppThemeToBlocksuiteTheme(raw: string | null | undefined): "light" | "dark" {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("dark") || v.includes("dracula") || v.includes("night")) {
    return "dark";
  }
  return "light";
}

export function getCurrentAppTheme(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "light";
  }
  const root = document.documentElement;
  return normalizeAppThemeToBlocksuiteTheme(root.dataset.theme) === "dark" || root.classList.contains("dark")
    ? "dark"
    : "light";
}

export function getPostMessageTargetOrigin(): string {
  if (typeof window === "undefined") {
    return "*";
  }

  const origin = window.location.origin;
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}
