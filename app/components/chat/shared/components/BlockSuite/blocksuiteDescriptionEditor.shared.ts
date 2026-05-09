import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

export type DocMode = "page" | "edgeless";

export type BlocksuiteDescriptionEditorProps = {
  workspaceId: string;
  spaceId?: number;
  docId: string;
  /** 提前拉取远端文档快照，减少首次打开时的等待。 */
  intentPrewarm?: boolean;
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
  className?: string;
};

export const BLOCKSUITE_FULL_PANEL_EDITOR_CLASS = "h-full min-h-0 rounded-md";

function normalizeAppThemeToBlocksuiteTheme(raw: string | null | undefined): "light" | "dark" {
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
