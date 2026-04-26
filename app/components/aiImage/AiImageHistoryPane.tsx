import { useCallback, useEffect, useState } from "react";

import type {
  AiImageHistoryPaneProps,
} from "@/components/aiImage/history/types";
import { DeleteHistoryConfirmModal, DownloadHistoryConfirmModal, ClearHistoryConfirmModal } from "@/components/aiImage/history/HistoryConfirmModal";
import { DirectorHistoryPanel } from "@/components/aiImage/history/DirectorHistoryPanel";
import { StandardHistoryPanel } from "@/components/aiImage/history/StandardHistoryPanel";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

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
    setIsDownloadHistoryConfirmOpen(false);
    setIsClearHistoryConfirmOpen(false);
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
      <DownloadHistoryConfirmModal
        isOpen={isDownloadHistoryConfirmOpen}
        onClose={handleCloseDownloadHistoryConfirm}
        onConfirm={handleConfirmDownloadHistory}
      />
      <ClearHistoryConfirmModal
        isOpen={isClearHistoryConfirmOpen}
        onClose={handleCloseClearHistoryConfirm}
        onConfirm={() => void handleConfirmClearHistory()}
      />
      <DeleteHistoryConfirmModal
        isOpen={Boolean(pendingDeleteHistoryRow)}
        onClose={handleCloseDeleteHistoryRow}
        onConfirm={() => void handleConfirmDeleteHistoryRow()}
      />
    </>
  );
}
