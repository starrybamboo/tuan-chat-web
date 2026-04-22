export function clearPinnedPreviewAction(args: {
  pinnedPreviewKey: string | null;
  setPinnedPreviewKey: (value: string | null) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.pinnedPreviewKey)
    return;
  args.setPinnedPreviewKey(null);
  args.showSuccessToast("宸插彇娑堝浐瀹氶瑙堛€?");
}

export function selectPinnedPreviewAction(args: {
  pinnedPreviewKey: string | null;
  results: any[];
  generatedItemKey: (item: any) => string;
  handleSelectCurrentResult: (index: number) => void;
  historyRowByKey: Map<string, any>;
  handlePreviewHistoryRow: (row: any) => void;
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
  args.showSuccessToast("宸叉妸 pinned 棰勮 seed 鍥炲～鍒拌缃€?");
}

export function openPreviewImageAction(args: {
  selectedPreviewResult: unknown;
  setIsPreviewImageModalOpen: (value: boolean) => void;
}) {
  if (!args.selectedPreviewResult)
    return;
  args.setIsPreviewImageModalOpen(true);
}

export function togglePinnedPreviewAction(args: {
  selectedPreviewResult: unknown;
  selectedPreviewIdentityKey: string | null;
  pinnedPreviewKey: string | null;
  setPinnedPreviewKey: (value: string | null) => void;
  showSuccessToast: (message: string) => void;
}) {
  if (!args.selectedPreviewResult || !args.selectedPreviewIdentityKey)
    return;
  const nextPinnedKey = args.pinnedPreviewKey === args.selectedPreviewIdentityKey ? null : args.selectedPreviewIdentityKey;
  args.setPinnedPreviewKey(nextPinnedKey);
  args.showSuccessToast(nextPinnedKey ? "宸插浐瀹氬綋鍓嶉瑙堛€?" : "宸插彇娑堝浐瀹氬綋鍓嶉瑙堛€?");
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
  args.showSuccessToast("宸叉妸褰撳墠棰勮 seed 鍥炲～鍒拌缃€?");
}

export function downloadCurrentAction(args: {
  selectedPreviewResult: any;
  downloadGeneratedImage: (image: any, filePrefix: string) => void;
}) {
  args.downloadGeneratedImage(args.selectedPreviewResult, "nai");
}
