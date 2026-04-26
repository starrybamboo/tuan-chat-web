import type { MouseEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";

import type {
  HistoryDragPayload,
} from "@/components/aiImage/history/types";
import type {
  CurrentResultCard,
} from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";
import {
  generatedItemKey,
  historyRowKey,
  historyRowToGeneratedItem,
} from "@/components/aiImage/helpers";
import { HistoryActionsFooter } from "@/components/aiImage/history/HistoryActionsFooter";
import { HistoryHint } from "@/components/aiImage/history/HistoryHint";
import { HISTORY_THUMBNAIL_IMAGE_CLASS_NAME } from "@/components/aiImage/history/HistoryImageTile";
import { ChevronDown, XMarkICon } from "@/icons";

function HistoryDeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-square btn-xs shrink-0 opacity-0 transition-opacity hover:text-error group-focus-within:opacity-100 group-hover:opacity-100"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <XMarkICon className="size-3.5" />
    </button>
  );
}

interface DirectorHistoryPanelProps {
  historyLength: number;
  currentResultCards: CurrentResultCard[];
  archivedHistoryRows: AiImageHistoryRow[];
  directorInputPreviewKey?: string;
  isHistoryExpanded: boolean;
  onHistoryExpandedChange: (expanded: boolean) => void;
  onCurrentResultCardClick: (index: number, row: AiImageHistoryRow | null, event: MouseEvent<HTMLButtonElement>) => void;
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

export function DirectorHistoryPanel({
  historyLength,
  currentResultCards,
  archivedHistoryRows,
  directorInputPreviewKey,
  isHistoryExpanded,
  onHistoryExpandedChange,
  onCurrentResultCardClick,
  onHistoryRowClick,
  onHistoryImageDragStart,
  onRequestDeleteHistoryRow,
  onRequestDownloadAll,
  onRequestClearHistory,
  onCollapse,
}: DirectorHistoryPanelProps) {
  const directorHistoryCardClassName = "group rounded-2xl border p-2 transition-colors";
  const directorHistoryCardIdleClassName = "border-base-300 bg-base-100 hover:border-primary/35 hover:bg-base-200/55";
  const directorHistoryCardActiveClassName = "border-primary/45 bg-primary/10";

  return (
    <div className="h-full min-h-0 w-[196px] shrink-0 overflow-hidden border-l border-[#D6DCE3] bg-[#F3F5F7] p-3 dark:border-[#2A3138] dark:bg-[#161A1F]">
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-base-content/60">History</div>
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
          <div className="mb-4">
            <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/45">Current</div>
            <div className="flex flex-col gap-2">
              {currentResultCards.map(({ item, index, row }) => (
                <div
                  key={`${item.batchId}-${item.batchIndex}`}
                  className={`${directorHistoryCardClassName} ${directorInputPreviewKey === generatedItemKey(item) ? directorHistoryCardActiveClassName : directorHistoryCardIdleClassName}`}
                >
                  <button
                    type="button"
                    className="w-full cursor-grab text-left active:cursor-grabbing"
                    draggable
                    onClick={event => onCurrentResultCardClick(index, row, event)}
                    onDragStart={event => onHistoryImageDragStart(event, {
                      dataUrl: item.dataUrl,
                      seed: item.seed,
                      batchIndex: item.batchIndex,
                    })}
                  >
                    <img src={item.dataUrl} className={`${HISTORY_THUMBNAIL_IMAGE_CLASS_NAME} mx-auto rounded-xl`} alt="director-current-result" />
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-base-content/70">
                      <span className="truncate">{item.toolLabel || "Current"}</span>
                      <span>{`${item.width}×${item.height}`}</span>
                    </div>
                  </button>
                  {row?.id != null
                    ? (
                        <div className="mt-1 flex justify-end">
                          <HistoryDeleteButton
                            label="删除本次绘图记录"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRequestDeleteHistoryRow(row);
                            }}
                          />
                        </div>
                      )
                    : null}
                </div>
              ))}
              {!currentResultCards.length ? <div className="px-1 py-2 text-xs text-base-content/45">暂无当前结果</div> : null}
            </div>
          </div>

          <details
            className="rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] px-2 py-1 dark:border-[#2A3138] dark:bg-[#161A1F]"
            open={isHistoryExpanded}
            onToggle={(event) => {
              onHistoryExpandedChange(event.currentTarget.open);
            }}
          >
            <summary className="cursor-pointer list-none px-1 py-1" title={isHistoryExpanded ? "折叠历史绘图" : "展开历史绘图"}>
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/45">History</div>
                <div className="ml-auto flex items-center gap-2 text-[11px] text-base-content/45">
                  <ChevronDown className={`size-4 transition-transform ${isHistoryExpanded ? "rotate-180" : ""}`} />
                </div>
              </div>
            </summary>
            <div className="mt-2 flex flex-col gap-2 pb-1">
              {archivedHistoryRows.map(row => (
                <div
                  key={historyRowKey(row)}
                  className={`${directorHistoryCardClassName} ${directorInputPreviewKey === generatedItemKey(historyRowToGeneratedItem(row)) ? directorHistoryCardActiveClassName : directorHistoryCardIdleClassName}`}
                >
                  <button
                    type="button"
                    className="w-full cursor-grab text-left active:cursor-grabbing"
                    draggable
                    onClick={event => onHistoryRowClick(row, event)}
                    onDragStart={event => onHistoryImageDragStart(event, {
                      dataUrl: row.dataUrl,
                      seed: row.seed,
                      batchIndex: row.batchIndex ?? undefined,
                    })}
                  >
                    <img src={row.dataUrl} className={`${HISTORY_THUMBNAIL_IMAGE_CLASS_NAME} mx-auto rounded-xl`} alt="director-history" />
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-base-content/70">
                      <span className="truncate">{row.toolLabel || `seed ${row.seed}`}</span>
                      <span>{`${row.width}×${row.height}`}</span>
                    </div>
                  </button>
                  {row.id != null
                    ? (
                        <div className="mt-1 flex justify-end">
                          <HistoryDeleteButton
                            label="删除历史绘图记录"
                            onClick={(event) => {
                              event.stopPropagation();
                              onRequestDeleteHistoryRow(row);
                            }}
                          />
                        </div>
                      )
                    : null}
                </div>
              ))}
              {!archivedHistoryRows.length ? <div className="px-1 py-2 text-xs text-base-content/45">暂无历史记录</div> : null}
            </div>
          </details>
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
