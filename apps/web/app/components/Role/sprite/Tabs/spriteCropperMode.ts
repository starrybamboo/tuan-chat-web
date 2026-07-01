export type SpriteCropperOperationMode = "single" | "batch";

type ResolveSpriteCropperOperationModeArgs = {
  isMultiSelectMode: boolean;
  selectedCount: number;
  forceBatchMode?: boolean;
};

export function resolveSpriteCropperOperationMode({
  isMultiSelectMode,
  selectedCount,
  forceBatchMode = false,
}: ResolveSpriteCropperOperationModeArgs): SpriteCropperOperationMode {
  if (forceBatchMode && selectedCount > 0) {
    return "batch";
  }
  return isMultiSelectMode && selectedCount > 1 ? "batch" : "single";
}
