import { TrashSimpleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import type {
  AiImageHistoryPaneProps,
} from "@/components/aiImage/history/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import { DirectorHistoryPanel } from "@/components/aiImage/history/DirectorHistoryPanel";
import { StandardHistoryPanel } from "@/components/aiImage/history/StandardHistoryPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SharpDownload } from "@/icons";

export function AiImageHistoryPane({
  isDirectorToolsOpen,
  onCollapse,
  history,
  mode,
  currentResultCards,
  archivedHistoryRows,
  selectedHistoryPreviewKey,
  selectedResultIndex,
  directorInputPreviewKey,
  isHistoryExpanded,
  onHistoryExpandedChange,
  onCurrentResultCardClick,
  onHistoryRowClick,
  onHistoryImageDragStart,
  onDeleteHistoryRow,
  onDownloadAll,
  onClearHistory,
}: AiImageHistoryPaneProps) {
  const [pendingDeleteHistoryRow, setPendingDeleteHistoryRow] = useState<AiImageHistoryRow | null>(null);
  const [isDownloadHistoryConfirmOpen, setIsDownloadHistoryConfirmOpen] = useState(false);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);

  const requestDeleteHistoryRow = useCallback((row: AiImageHistoryRow) => {
    if (typeof row.id !== "number")
      return;
    setPendingDeleteHistoryRow(row);
  }, []);

  const handleCloseDeleteHistoryRow = useCallback(() => {
    setPendingDeleteHistoryRow(null);
  }, []);

  const handleConfirmDeleteHistoryRow = useCallback(async () => {
    if (!pendingDeleteHistoryRow)
      return;

    const row = pendingDeleteHistoryRow;
    setPendingDeleteHistoryRow(null);
    await onDeleteHistoryRow(row);
  }, [onDeleteHistoryRow, pendingDeleteHistoryRow]);

  const handleOpenDownloadHistoryConfirm = useCallback(() => {
    if (!history.length)
      return;
    setIsDownloadHistoryConfirmOpen(true);
  }, [history.length]);

  const handleCloseDownloadHistoryConfirm = useCallback(() => {
    setIsDownloadHistoryConfirmOpen(false);
  }, []);

  const handleConfirmDownloadHistory = useCallback(() => {
    setIsDownloadHistoryConfirmOpen(false);
    onDownloadAll();
  }, [onDownloadAll]);

  const handleOpenClearHistoryConfirm = useCallback(() => {
    if (!history.length)
      return;
    setIsClearHistoryConfirmOpen(true);
  }, [history.length]);

  const handleCloseClearHistoryConfirm = useCallback(() => {
    setIsClearHistoryConfirmOpen(false);
  }, []);

  const handleConfirmClearHistory = useCallback(async () => {
    setIsClearHistoryConfirmOpen(false);
    await onClearHistory();
  }, [onClearHistory]);

  useEffect(() => {
    if (history.length)
      return;
    queueMicrotask(() => setIsDownloadHistoryConfirmOpen(false));
    queueMicrotask(() => setIsClearHistoryConfirmOpen(false));
  }, [history.length]);

  return (
    <>
      {isDirectorToolsOpen
        ? (
            <DirectorHistoryPanel
              historyLength={history.length}
              currentResultCards={currentResultCards}
              archivedHistoryRows={archivedHistoryRows}
              directorInputPreviewKey={directorInputPreviewKey}
              isHistoryExpanded={isHistoryExpanded}
              onHistoryExpandedChange={onHistoryExpandedChange}
              onCurrentResultCardClick={onCurrentResultCardClick}
              onHistoryRowClick={onHistoryRowClick}
              onHistoryImageDragStart={onHistoryImageDragStart}
              onRequestDeleteHistoryRow={requestDeleteHistoryRow}
              onRequestDownloadAll={handleOpenDownloadHistoryConfirm}
              onRequestClearHistory={handleOpenClearHistoryConfirm}
              onCollapse={onCollapse}
            />
          )
        : (
            <StandardHistoryPanel
              historyLength={history.length}
              mode={mode}
              currentResultCards={currentResultCards}
              archivedHistoryRows={archivedHistoryRows}
              selectedHistoryPreviewKey={selectedHistoryPreviewKey}
              selectedResultIndex={selectedResultIndex}
              onCurrentResultCardClick={onCurrentResultCardClick}
              onHistoryRowClick={onHistoryRowClick}
              onHistoryImageDragStart={onHistoryImageDragStart}
              onRequestDeleteHistoryRow={requestDeleteHistoryRow}
              onRequestDownloadAll={handleOpenDownloadHistoryConfirm}
              onRequestClearHistory={handleOpenClearHistoryConfirm}
              onCollapse={onCollapse}
            />
          )}
      <ConfirmDialog
        open={isDownloadHistoryConfirmOpen}
        onOpenChange={(open) => {
          if (!open)
            handleCloseDownloadHistoryConfirm();
        }}
        onConfirm={handleConfirmDownloadHistory}
        title="下载全部图片？"
        confirmLabel="开始下载"
        cancelLabel="暂不下载"
        icon={<SharpDownload className="size-6" />}
        variant="info"
      />
      <ConfirmDialog
        open={isClearHistoryConfirmOpen}
        onOpenChange={(open) => {
          if (!open)
            handleCloseClearHistoryConfirm();
        }}
        onConfirm={() => void handleConfirmClearHistory()}
        title="清空全部历史记录？"
        confirmLabel="确认清空"
        cancelLabel="先不清空"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteHistoryRow)}
        onOpenChange={(open) => {
          if (!open)
            handleCloseDeleteHistoryRow();
        }}
        onConfirm={() => void handleConfirmDeleteHistoryRow()}
        title="删除这张图片？"
        confirmLabel="确认删除"
        cancelLabel="先保留"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />
    </>
  );
}
