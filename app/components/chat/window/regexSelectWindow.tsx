import type { ChatMessageResponse } from "../../../../api";
import type {
  MessageDisplayFilterAction,
  MessageDisplayFilterConfig,
} from "@/components/chat/utils/messageDisplayFilter";

import { Funnel, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createMessageDisplayFilterMatcher } from "@/components/chat/utils/messageDisplayFilter";

interface RegexSelectWindowProps {
  sourceMessages: ChatMessageResponse[];
  currentFilter: MessageDisplayFilterConfig | null;
  onChangeFilter: (filter: MessageDisplayFilterConfig | null) => void;
  onClose: () => void;
}

const FILTER_DEBOUNCE_MS = 260;
const DEFAULT_FILTER_CONFIG: MessageDisplayFilterConfig = {
  action: "keep",
  filterOutOfCharacterSpeech: false,
  regexFlags: "i",
  regexPattern: "",
};

export default function RegexSelectWindow({
  sourceMessages,
  currentFilter,
  onChangeFilter,
  onClose,
}: RegexSelectWindowProps) {
  const [regexPattern, setRegexPattern] = useState(currentFilter?.regexPattern ?? DEFAULT_FILTER_CONFIG.regexPattern);
  const regexFlags = "i";
  const [filterOutOfCharacterSpeech, setFilterOutOfCharacterSpeech] = useState(
    currentFilter?.filterOutOfCharacterSpeech ?? DEFAULT_FILTER_CONFIG.filterOutOfCharacterSpeech,
  );
  const [filterAction, setFilterAction] = useState<MessageDisplayFilterAction>(
    currentFilter?.action ?? DEFAULT_FILTER_CONFIG.action,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filterConfig = useMemo<MessageDisplayFilterConfig>(() => ({
    action: filterAction,
    filterOutOfCharacterSpeech,
    regexFlags,
    regexPattern,
  }), [filterAction, filterOutOfCharacterSpeech, regexPattern]);
  const regexMatcher = useMemo(() => createMessageDisplayFilterMatcher(filterConfig), [filterConfig]);

  const hasInput = regexPattern.trim() !== "" || filterOutOfCharacterSpeech;
  const canApplyDraft = hasInput && (!regexMatcher.error || filterOutOfCharacterSpeech);

  const matchedMessageIds = useMemo(() => {
    if (!regexMatcher.test) {
      return [] as number[];
    }

    return sourceMessages
      .filter(msg => regexMatcher.test?.(msg) ?? false)
      .map(m => m.message.messageId)
      .filter((id): id is number => typeof id === "number" && id > 0);
  }, [regexMatcher, sourceMessages]);

  const visibleCount = hasInput && regexMatcher.test
    ? (filterAction === "keep" ? matchedMessageIds.length : sourceMessages.length - matchedMessageIds.length)
    : sourceMessages.length;
  const hiddenCount = sourceMessages.length - visibleCount;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!hasInput) {
        onChangeFilter(null);
        return;
      }
      if (canApplyDraft) {
        onChangeFilter(filterConfig);
      }
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [canApplyDraft, filterConfig, hasInput, onChangeFilter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) {
        return;
      }
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleClear = useCallback(() => {
    setRegexPattern("");
    setFilterOutOfCharacterSpeech(false);
    onChangeFilter(null);
  }, [onChangeFilter]);

  return (
    <div className="pointer-events-auto w-[min(92vw,760px)] overflow-hidden rounded-md border border-primary/20 bg-base-100/94 text-base-content shadow-2xl shadow-primary/10 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-base-content/10 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Funnel className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-5">消息筛选</div>
            <div className="truncate text-xs text-base-content/55">
              显示
              {" "}
              {visibleCount}
              {" / "}
              {sourceMessages.length}
              {" "}
              条
              {hiddenCount > 0 ? `，隐藏 ${hiddenCount} 条` : ""}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle h-7 min-h-0 w-7 rounded-md"
          onClick={onClose}
          title="关闭筛选面板"
          aria-label="关闭筛选面板"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label aria-label="输入正则表达式" className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-base-content/15 bg-base-200/45 px-2.5 py-2 transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
            <Funnel className="size-4 shrink-0 text-base-content/45" />
            <input
              ref={inputRef}
              type="text"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-base-content/40"
              value={regexPattern}
              onChange={event => setRegexPattern(event.target.value)}
              placeholder="输入正则表达式，近实时更新显示条件"
            />
          </label>
          <div className="join shrink-0">
            <button
              type="button"
              className={`join-item btn btn-sm h-9 min-h-0 rounded-md ${filterAction === "keep" ? "btn-primary" : "btn-ghost border border-base-content/15"}`}
              onClick={() => setFilterAction("keep")}
            >
              筛选
            </button>
            <button
              type="button"
              className={`join-item btn btn-sm h-9 min-h-0 rounded-md ${filterAction === "remove" ? "btn-primary" : "btn-ghost border border-base-content/15"}`}
              onClick={() => setFilterAction("remove")}
            >
              反选
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
            filterOutOfCharacterSpeech
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-base-content/12 bg-base-200/35 text-base-content/70 hover:border-base-content/25"
          }`}
          >
            <input
              type="checkbox"
              className="toggle toggle-xs"
              checked={filterOutOfCharacterSpeech}
              onChange={event => setFilterOutOfCharacterSpeech(event.target.checked)}
            />
            过滤场外发言
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-xs h-8 min-h-0 rounded-md px-2"
            onClick={handleClear}
            disabled={!hasInput}
          >
            清除筛选
          </button>
        </div>

        {regexMatcher.error && (
          <div className="rounded-md border border-error/25 bg-error/10 px-3 py-2 text-xs text-error">
            表达式错误：
            {regexMatcher.error}
            {filterOutOfCharacterSpeech ? "；当前仍按场外发言条件筛选" : "；已保持上一次显示条件"}
          </div>
        )}
      </div>
    </div>
  );
}
