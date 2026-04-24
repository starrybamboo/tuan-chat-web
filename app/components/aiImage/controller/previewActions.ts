import type { GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

export function clearPinnedPreviewAction(args: {
  pinnedPreviewKey: string | null;
  setPinnedPreviewKey: (value: string | null) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.pinnedPreviewKey)
    return;
  args.setPinnedPreviewKey(null);
  args.showSuccessToast("已清除固定预览。");
}

export function selectPinnedPreviewAction(args: {
  pinnedPreviewKey: string | null;
  results: GeneratedImageItem[];
  generatedItemKey: (item: GeneratedImageItem) => string;
  handleSelectCurrentResult: (index: number) => void;
  historyRowByKey: Map<string, AiImageHistoryRow>;
  handlePreviewHistoryRow: (row: AiImageHistoryRow) => void;
}) {
  if (!args.pinnedPreviewKey)
    return;

  if (args.pinnedPreviewKey.startsWith("current:")) {
    const currentKey = args.pinnedPreviewKey.slice("current:".length);
    const currentResultIndex = args.results.findIndex(item => args.generatedItemKey(item) === currentKey);
    if (currentResultIndex >= 0)
      args.handleSelectCurrentResult(currentResultIndex);
    return;
  }

  if (args.pinnedPreviewKey.startsWith("history:")) {
    const historyKey = args.pinnedPreviewKey.slice("history:".length);
    const historyRow = args.historyRowByKey.get(historyKey);
    if (historyRow)
      args.handlePreviewHistoryRow(historyRow);
  }
}

export function applyPinnedPreviewSeedAction(args: {
  pinnedPreviewResult: { seed: number } | null;
  uiMode: "simple" | "pro";
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.pinnedPreviewResult)
    return;
  if (args.uiMode === "simple")
    args.setSimpleSeed(args.pinnedPreviewResult.seed);
  else
    args.setProSeed(args.pinnedPreviewResult.seed);
  args.showSuccessToast("已应用固定预览 seed。");
}

export function openPreviewImageAction(args: {
  selectedPreviewResult: GeneratedImageItem | null;
  setIsPreviewImageModalOpen: (value: boolean) => void;
}) {
  if (!args.selectedPreviewResult)
    return;
  args.setIsPreviewImageModalOpen(true);
}

export function togglePinnedPreviewAction(args: {
  selectedPreviewResult: GeneratedImageItem | null;
  selectedPreviewIdentityKey: string | null;
  pinnedPreviewKey: string | null;
  setPinnedPreviewKey: (value: string | null) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.selectedPreviewResult || !args.selectedPreviewIdentityKey)
    return;
  const nextPinnedKey = args.pinnedPreviewKey === args.selectedPreviewIdentityKey ? null : args.selectedPreviewIdentityKey;
  args.setPinnedPreviewKey(nextPinnedKey);
  args.showSuccessToast(nextPinnedKey ? "已固定当前预览。" : "已取消固定当前预览。");
}

export function applySelectedPreviewSeedAction(args: {
  selectedPreviewResult: { seed: number } | null;
  uiMode: "simple" | "pro";
  setSimpleSeed: (value: number) => void;
  setProSeed: (value: number) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.selectedPreviewResult)
    return;
  if (args.uiMode === "simple")
    args.setSimpleSeed(args.selectedPreviewResult.seed);
  else
    args.setProSeed(args.selectedPreviewResult.seed);
  args.showSuccessToast("已应用当前预览 seed。");
}

export function downloadCurrentAction(args: {
  selectedPreviewResult: GeneratedImageItem | null;
  downloadGeneratedImage: (image: GeneratedImageItem | null, filePrefix: string) => void;
}) {
  args.downloadGeneratedImage(args.selectedPreviewResult, "nai");
}
