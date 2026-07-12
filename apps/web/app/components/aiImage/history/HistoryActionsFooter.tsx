import { Button } from "@/components/common/Button";
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
    <div className="
      mt-3 flex shrink-0 flex-col gap-2 border-t border-base-300 pt-3
          ">
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        disabled={!historyLength}
        onClick={onRequestDownloadAll}
        icon={<SharpDownload className="size-4" />}
      >
        <span>下载全部</span>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="
          w-full disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/50
        "
        disabled={!historyLength}
        onClick={onRequestClearHistory}
      >
        清空历史
      </Button>
    </div>
  );
}
