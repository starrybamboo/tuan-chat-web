const COMMAND_PANEL_DEFAULT_MAX_HEIGHT = 260;
const COMMAND_PANEL_MIN_HEIGHT = 96;
const COMMAND_PANEL_VERTICAL_GAP = 4;

export function resolveCommandPanelMaxHeight(maxHeight?: number): number {
  const hasExplicitMaxHeight = typeof maxHeight === "number" && Number.isFinite(maxHeight);
  const availableHeight = hasExplicitMaxHeight ? maxHeight : COMMAND_PANEL_DEFAULT_MAX_HEIGHT;
  const resolvedHeight = Math.floor(availableHeight - COMMAND_PANEL_VERTICAL_GAP);

  if (hasExplicitMaxHeight) {
    return Math.max(1, resolvedHeight);
  }

  return Math.max(COMMAND_PANEL_MIN_HEIGHT, resolvedHeight);
}
