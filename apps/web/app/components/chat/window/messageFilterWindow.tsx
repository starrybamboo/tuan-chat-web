import type { ChatMessageResponse } from "../../../../api";
import type {
  MessageDisplayFilterAction,
  MessageDisplayFilterConfig,
} from "@/components/chat/utils/messageDisplayFilter";

import { Funnel } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { createMessageDisplayFilterMatcher } from "@/components/chat/utils/messageDisplayFilter";

interface MessageFilterWindowProps {
  sourceMessages: ChatMessageResponse[];
  currentFilter: MessageDisplayFilterConfig | null;
  onChangeFilter: (filter: MessageDisplayFilterConfig | null) => void;
  onClose: () => void;
}

const FILTER_DEBOUNCE_MS = 260;
const DEFAULT_FILTER_CONFIG: MessageDisplayFilterConfig = {
  action: "remove",
  filterOutOfCharacterSpeech: false,
  filterStateMessages: false,
};

export default function MessageFilterWindow({
  sourceMessages,
  currentFilter,
  onChangeFilter,
  onClose,
}: MessageFilterWindowProps) {
  const [filterOutOfCharacterSpeech, setFilterOutOfCharacterSpeech] = useState(
    currentFilter?.filterOutOfCharacterSpeech ?? DEFAULT_FILTER_CONFIG.filterOutOfCharacterSpeech,
  );
  const [filterStateMessages, setFilterStateMessages] = useState(
    currentFilter?.filterStateMessages ?? DEFAULT_FILTER_CONFIG.filterStateMessages,
  );
  const [filterAction, setFilterAction] = useState<MessageDisplayFilterAction>(
    currentFilter?.action ?? DEFAULT_FILTER_CONFIG.action,
  );
  const filterConfig = useMemo<MessageDisplayFilterConfig>(() => ({
    action: filterAction,
    filterOutOfCharacterSpeech,
    filterStateMessages,
  }), [filterAction, filterOutOfCharacterSpeech, filterStateMessages]);
  const filterMatcher = useMemo(() => createMessageDisplayFilterMatcher(filterConfig), [filterConfig]);

  const hasCriteria = filterOutOfCharacterSpeech || filterStateMessages;

  const matchedMessageCount = useMemo(() => {
    if (!filterMatcher.test) {
      return 0;
    }
    return sourceMessages.filter(message => filterMatcher.test?.(message) ?? false).length;
  }, [filterMatcher, sourceMessages]);

  const visibleCount = hasCriteria && filterMatcher.test
    ? (filterAction === "keep" ? matchedMessageCount : sourceMessages.length - matchedMessageCount)
    : sourceMessages.length;
  const hiddenCount = sourceMessages.length - visibleCount;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (!hasCriteria) {
        onChangeFilter(null);
        return;
      }
      onChangeFilter(filterConfig);
    }, FILTER_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [filterConfig, hasCriteria, onChangeFilter]);

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

  return (
    <div className="
      pointer-events-auto w-[min(92vw,560px)] overflow-hidden rounded-md border
      border-primary/20 bg-base-100/94 text-base-content shadow-2xl
      shadow-primary/10 backdrop-blur-xl
    ">
      <div className="
        flex items-center justify-between gap-3 border-b border-base-content/10
        px-3 py-2
      ">
        <div className="flex min-w-0 items-center gap-2">
          <span className="
            inline-flex size-7 shrink-0 items-center justify-center rounded-md
            bg-primary/10 text-primary
          ">
            <Funnel className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm/5 font-semibold">消息筛选</div>
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

        <div className="join shrink-0">
          <button
            type="button"
            className={`
              join-item btn btn-sm h-8 min-h-0 rounded-md px-3
              ${filterAction === "remove" ? `btn-primary` : `
                btn-ghost border border-base-content/15
              `}
            `}
            onClick={() => setFilterAction("remove")}
          >
            筛选
          </button>
          <button
            type="button"
            className={`
              join-item btn btn-sm h-8 min-h-0 rounded-md px-3
              ${filterAction === "keep" ? `btn-primary` : `
                btn-ghost border border-base-content/15
              `}
            `}
            onClick={() => setFilterAction("keep")}
          >
            反选
          </button>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="
          grid gap-2
          sm:grid-cols-2
        ">
          <label className={`
            flex cursor-pointer select-none items-start gap-2 rounded-md border
            px-3 py-2 transition
            ${
            filterOutOfCharacterSpeech
              ? "border-primary/40 bg-primary/10 text-primary"
              : `
                border-base-content/12 bg-base-200/35 text-base-content/70
                hover:border-base-content/25
              `
          }
          `}
          >
            <input
              type="checkbox"
              className="toggle toggle-xs mt-1"
              checked={filterOutOfCharacterSpeech}
              onChange={event => setFilterOutOfCharacterSpeech(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm/5 font-medium">隐藏场外发言</span>
              <span className="block text-xs/4 text-base-content/55">
                筛选时隐藏括号中的对白外发言
              </span>
            </span>
          </label>

          <label className={`
            flex cursor-pointer select-none items-start gap-2 rounded-md border
            px-3 py-2 transition
            ${
            filterStateMessages
              ? "border-primary/40 bg-primary/10 text-primary"
              : `
                border-base-content/12 bg-base-200/35 text-base-content/70
                hover:border-base-content/25
              `
          }
          `}
          >
            <input
              type="checkbox"
              className="toggle toggle-xs mt-1"
              checked={filterStateMessages}
              onChange={event => setFilterStateMessages(event.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm/5 font-medium">隐藏状态消息</span>
              <span className="block text-xs/4 text-base-content/55">
                筛选时隐藏状态事件消息
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
