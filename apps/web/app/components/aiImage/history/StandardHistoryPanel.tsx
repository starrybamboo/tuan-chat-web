import type { MouseEvent } from "react";

import { CaretRightIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";

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
import { IconButton } from "@/components/common/IconButton";
import { structuralListItemMotionProps } from "@/components/common/motion/listItemMotion";

type StandardHistoryPanelProps = {
  historyLength: number;
  mode: AiImageHistoryMode;
  currentResultCards: CurrentResultCard[];
  archivedHistoryRows: AiImageHistoryRow[];
  selectedHistoryPreviewKey: string | null;
  selectedResultIndex: number;
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

export function StandardHistoryPanel({
  historyLength,
  mode,
  currentResultCards,
  archivedHistoryRows,
  selectedHistoryPreviewKey,
  selectedResultIndex,
  onCurrentResultCardClick,
  onHistoryRowClick,
  onHistoryImageDragStart,
  onRequestDeleteHistoryRow,
  onRequestDownloadAll,
  onRequestClearHistory,
  onCollapse,
}: StandardHistoryPanelProps) {
  return (
    <div className="
      h-full min-h-0 w-[160px] shrink-0 overflow-hidden rounded-md border
      border-base-300 bg-base-100 p-3 shadow-sm
           ">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">历史记录</div>
            <HistoryHint />
          </div>
          <IconButton
            size="xs"
            shape="square"
            className="
              ml-auto shrink-0
              text-base-content/60
              hover:text-base-content
            "
            label="收起历史记录侧边栏"
            title="收起历史记录侧边栏"
            onClick={onCollapse}
            icon={<CaretRightIcon className="size-3.5" weight="regular" />}
          />
        </div>
        <div className="ai-image-fade-scrollbar flex-1 overflow-auto pr-1">
          <div className="
            grid grid-cols-1 justify-items-center gap-2 border-t
            border-base-300 py-3
                      ">
            <AnimatePresence initial={false} mode="popLayout">
              {currentResultCards.map(({ item, index, row }) => (
                <motion.div key={`${item.batchId}-${item.batchIndex}`} {...structuralListItemMotionProps()}>
                  <HistoryImageTile
                    active={!selectedHistoryPreviewKey && selectedResultIndex === index}
                    alt="current-result"
                    dataUrl={item.dataUrl}
                    draggable
                    showInpaintBadge={row?.mode === "infill"}
                    title={`${row?.mode || mode} · seed ${item.seed} · ${item.width}×${item.height}`}
                    onClick={event => onCurrentResultCardClick(index, row, event)}
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
                </motion.div>
              ))}
              {archivedHistoryRows.map(row => (
                <motion.div key={historyRowKey(row)} {...structuralListItemMotionProps()}>
                  <HistoryImageTile
                    active={selectedHistoryPreviewKey === historyRowKey(row)}
                    alt="history"
                    dataUrl={row.dataUrl}
                    draggable
                    showInpaintBadge={row.mode === "infill"}
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
                </motion.div>
              ))}
            </AnimatePresence>
            {!currentResultCards.length && !archivedHistoryRows.length
              ? <div className="
                col-span-1 w-full rounded-md border border-dashed
                border-base-300 bg-base-200/70 px-3 py-5 text-center text-sm
                text-base-content/55
              ">暂无绘图记录</div>
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
