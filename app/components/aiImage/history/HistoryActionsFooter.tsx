import { SharpDownload } from "@/icons";

export function HistoryActionsFooter({
  historyLength,
  onRequestDownloadAll,
  onRequestClearHistory,
}: {
  historyLength: number;
  onRequestDownloadAll: () => void;
  onRequestClearHistory: () => void;
}) {
  return (
    <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-[#D6DCE3] pt-3 dark:border-[#2A3138]">
      <button
        type="button"
        className="btn btn-sm btn-outline w-full gap-2"
        disabled={!historyLength}
        onClick={onRequestDownloadAll}
      >
        <SharpDownload className="size-4" />
        <span>下载全部</span>
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost w-full disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/40"
        disabled={!historyLength}
        onClick={onRequestClearHistory}
      >
        清空历史
      </button>
    </div>
  );
}
