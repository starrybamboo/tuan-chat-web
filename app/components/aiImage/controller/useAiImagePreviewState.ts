import { useMemo, useState } from "react";

import type { CurrentResultCard, GeneratedImageItem } from "@/components/aiImage/types";
import type { AiImageHistoryRow } from "@/utils/aiImageHistoryDb";

import {
  generatedItemKey,
  historyRowKey,
  historyRowResultMatchKey,
  historyRowToGeneratedItem,
} from "@/components/aiImage/helpers";

export function useAiImagePreviewState() {
  const [results, setResults] = useState<GeneratedImageItem[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [selectedHistoryPreviewKey, setSelectedHistoryPreviewKey] = useState<string | null>(null);
  const [pinnedPreviewKey, setPinnedPreviewKey] = useState<string | null>(null);
  const [isPreviewImageModalOpen, setIsPreviewImageModalOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<AiImageHistoryRow[]>([]);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  const historyRowByKey = useMemo(() => {
    return new Map(history.map(row => [historyRowKey(row), row] as const));
  }, [history]);

  const historyRowByResultMatchKey = useMemo(() => {
    return new Map(history.map(row => [historyRowResultMatchKey(row), row] as const));
  }, [history]);

  const selectedResult = results[selectedResultIndex] || null;

  const selectedHistoryPreviewRow = useMemo(() => {
    if (!selectedHistoryPreviewKey)
      return null;
    return historyRowByKey.get(selectedHistoryPreviewKey) || null;
  }, [historyRowByKey, selectedHistoryPreviewKey]);

  const selectedPreviewResult = useMemo<GeneratedImageItem | null>(() => {
    if (selectedHistoryPreviewRow)
      return historyRowToGeneratedItem(selectedHistoryPreviewRow);
    return selectedResult;
  }, [selectedHistoryPreviewRow, selectedResult]);

  const selectedPreviewHistoryRow = useMemo(() => {
    if (selectedHistoryPreviewRow)
      return selectedHistoryPreviewRow;
    if (!selectedResult)
      return null;
    return historyRowByResultMatchKey.get(generatedItemKey(selectedResult)) || null;
  }, [historyRowByResultMatchKey, selectedHistoryPreviewRow, selectedResult]);

  const selectedPreviewIdentityKey = useMemo(() => {
    if (selectedHistoryPreviewRow)
      return `history:${historyRowKey(selectedHistoryPreviewRow)}`;
    if (selectedResult)
      return `current:${generatedItemKey(selectedResult)}`;
    return null;
  }, [selectedHistoryPreviewRow, selectedResult]);

  const pinnedPreviewResult = useMemo<GeneratedImageItem | null>(() => {
    if (!pinnedPreviewKey)
      return null;
    if (pinnedPreviewKey.startsWith("current:")) {
      const currentKey = pinnedPreviewKey.slice("current:".length);
      return results.find(item => generatedItemKey(item) === currentKey) || null;
    }
    if (pinnedPreviewKey.startsWith("history:")) {
      const historyKey = pinnedPreviewKey.slice("history:".length);
      const historyMatch = historyRowByKey.get(historyKey);
      return historyMatch ? historyRowToGeneratedItem(historyMatch) : null;
    }
    return null;
  }, [historyRowByKey, pinnedPreviewKey, results]);

  const currentResultCards = useMemo<CurrentResultCard[]>(() => {
    return results.map((item, index) => ({
      item,
      index,
      row: historyRowByResultMatchKey.get(generatedItemKey(item)) || null,
    }));
  }, [historyRowByResultMatchKey, results]);

  const currentHistoryRowKeys = useMemo(() => {
    return new Set(
      currentResultCards
        .map(card => (card.row ? historyRowKey(card.row) : null))
        .filter((value): value is string => Boolean(value)),
    );
  }, [currentResultCards]);

  const archivedHistoryRows = useMemo(() => {
    return history.filter(row => !currentHistoryRowKeys.has(historyRowKey(row)));
  }, [currentHistoryRowKeys, history]);

  const isSelectedPreviewPinned = Boolean(selectedPreviewIdentityKey && pinnedPreviewKey === selectedPreviewIdentityKey);

  const previewMeta = selectedPreviewResult
    ? [
        selectedPreviewResult.toolLabel || selectedPreviewHistoryRow?.toolLabel || "",
        `seed: ${selectedPreviewResult.seed}`,
        `${selectedPreviewResult.width} × ${selectedPreviewResult.height}`,
      ].filter(Boolean).join(" · ")
    : "";

  return {
    results,
    setResults,
    selectedResultIndex,
    setSelectedResultIndex,
    selectedHistoryPreviewKey,
    setSelectedHistoryPreviewKey,
    pinnedPreviewKey,
    setPinnedPreviewKey,
    isPreviewImageModalOpen,
    setIsPreviewImageModalOpen,
    history,
    setHistory,
    isHistoryExpanded,
    setIsHistoryExpanded,
    historyRowByKey,
    historyRowByResultMatchKey,
    selectedResult,
    selectedHistoryPreviewRow,
    selectedPreviewResult,
    selectedPreviewHistoryRow,
    selectedPreviewIdentityKey,
    pinnedPreviewResult,
    currentResultCards,
    archivedHistoryRows,
    isSelectedPreviewPinned,
    previewMeta,
    hasCurrentDisplayedImage: Boolean(selectedPreviewResult),
  };
}
