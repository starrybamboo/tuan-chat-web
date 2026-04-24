import type { MouseEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";

import type {
  HistoryDragPayload,
} from "@/components/aiImage/history/types";
import type {
  CurrentResultCard,
} from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import { historyRowKey } from "@/components/aiImage/helpers";
import { HistoryActionsFooter } from "@/components/aiImage/history/HistoryActionsFooter";
import { HistoryHint } from "@/components/aiImage/history/HistoryHint";
import { HistoryImageTile } from "@/components/aiImage/history/HistoryImageTile";

interface StandardHistoryPanelProps {
  historyLength: number;
  mode: AiImageHistoryMode;
  currentResultCards: CurrentResultCard[];
  archivedHistoryRows: AiImageHistoryRow[];
  selectedHistoryPreviewKey: string | null;
  selectedResultIndex: number;
  onSelectCurrentResult: (index: number) => void;
  onHistoryRowClick: (row: AiImageHistoryRow, event: MouseEvent<HTMLButtonElement>) => void;
  onHistoryImageDragStart: (
    event: React.DragEvent<HTMLElement>,
    payload: HistoryDragPayload,
  ) => void;
  onRequestDeleteHistoryRow: (row: AiImageHistoryRow) => void;
  onRequestDownloadAll: () => void;
  onRequestClearHistory: () => void;
  onCollapse: () => void;
}

export function StandardHistoryPanel({
  historyLength,
  mode,
  currentResultCards,
  archivedHistoryRows,
  selectedHistoryPreviewKey,
  selectedResultIndex,
  onSelectCurrentResult,
  onHistoryRowClick,
  onHistoryImageDragStart,
  onRequestDeleteHistoryRow,
  onRequestDownloadAll,
  onRequestClearHistory,
  onCollapse,
}: StandardHistoryPanelProps) {
  return (
    <div className="h-full min-h-0 w-[160px] shrink-0 overflow-hidden border-l border-[#D6DCE3] bg-[#F3F5F7] p-3 dark:border-[#2A3138] dark:bg-[#161A1F]">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">History</div>
            <HistoryHint />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs ml-auto shrink-0 text-base-content/60 hover:text-base-content"
            aria-label="收起历史记录侧边栏"
            title="收起历史记录侧边栏"
            onClick={onCollapse}
          >
            <CaretRightIcon className="size-3.5" weight="bold" />
          </button>
        </div>
        <div className="ai-image-fade-scrollbar flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 justify-items-center gap-2 border-t border-[#D6DCE3] py-3 dark:border-[#2A3138]">
            {currentResultCards.map(({ item, index, row }) => (
              <HistoryImageTile
                key={`${item.batchId}-${item.batchIndex}`}
                active={!selectedHistoryPreviewKey && selectedResultIndex === index}
                alt="current-result"
                dataUrl={item.dataUrl}
                draggable
                title={`${row?.mode || mode} · seed ${item.seed} · ${item.width}×${item.height}`}
                onClick={() => onSelectCurrentResult(index)}
                onDelete={row?.id != null
                  ? (event) => {
                      event.stopPropagation();
                      onRequestDeleteHistoryRow(row);
                    }
                  : undefined}
                onDragStart={event => onHistoryImageDragStart(event, {
                  dataUrl: item.dataUrl,
                  seed: item.seed,
                  batchIndex: item.batchIndex,
                })}
              />
            ))}
            {archivedHistoryRows.map(row => (
              <HistoryImageTile
                key={historyRowKey(row)}
                active={selectedHistoryPreviewKey === historyRowKey(row)}
                alt="history"
                dataUrl={row.dataUrl}
                draggable
                title={`${row.mode} · seed ${row.seed} · ${row.width}×${row.height}`}
                onClick={event => onHistoryRowClick(row, event)}
                onDelete={row.id != null
                  ? (event) => {
                      event.stopPropagation();
                      onRequestDeleteHistoryRow(row);
                    }
                  : undefined}
                onDragStart={event => onHistoryImageDragStart(event, {
                  dataUrl: row.dataUrl,
                  seed: row.seed,
                  batchIndex: row.batchIndex ?? undefined,
                })}
              />
            ))}
            {!currentResultCards.length && !archivedHistoryRows.length
              ? <div className="col-span-1 w-full rounded-xl border border-dashed border-base-300 bg-base-100 px-3 py-5 text-center text-sm text-base-content/55">暂无绘图记录</div>
              : null}
          </div>
        </div>
        <HistoryActionsFooter
          historyLength={historyLength}
          onRequestDownloadAll={onRequestDownloadAll}
          onRequestClearHistory={onRequestClearHistory}
        />
      </div>
    </div>
  );
}
