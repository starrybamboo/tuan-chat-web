import type { DragEvent, MouseEvent } from "react";

import type { CurrentResultCard } from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";

export interface HistoryDragPayload {
  dataUrl: string;
  seed: number;
  batchIndex?: number;
}

export interface AiImageHistoryPaneProps {
  isDirectorToolsOpen: boolean;
  onCollapse: () => void;
  history: AiImageHistoryRow[];
  mode: AiImageHistoryMode;
  currentResultCards: CurrentResultCard[];
  archivedHistoryRows: AiImageHistoryRow[];
  selectedHistoryPreviewKey: string | null;
  selectedResultIndex: number;
  directorInputPreviewKey?: string;
  isHistoryExpanded: boolean;
  onHistoryExpandedChange: (expanded: boolean) => void;
  onSelectCurrentResult: (index: number) => void;
  onHistoryRowClick: (row: AiImageHistoryRow, event: MouseEvent<HTMLButtonElement>) => void;
  onHistoryImageDragStart: (
    event: DragEvent<HTMLElement>,
    payload: HistoryDragPayload,
  ) => void;
  onDeleteHistoryRow: (row: AiImageHistoryRow) => void | Promise<void>;
  onDownloadAll: () => void;
  onClearHistory: () => void | Promise<void>;
}
