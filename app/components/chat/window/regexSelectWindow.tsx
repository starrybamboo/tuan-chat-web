import type { ChatMessageResponse } from "../../../../api";
import React, { useCallback, useMemo, useState } from "react";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";

type FilterAction = "remove" | "keep";

function sanitizeRegexFlags(flags: string): string {
  const allowed = new Set(["g", "i", "m", "s", "u", "y"]);
  const deduped: string[] = [];
  for (const rawFlag of flags.toLowerCase()) {
    if (!allowed.has(rawFlag))
      continue;
    if (deduped.includes(rawFlag))
      continue;
    deduped.push(rawFlag);
  }
  return deduped.filter(flag => flag !== "g" && flag !== "y").join("");
}

function extractSearchText(messageResponse: ChatMessageResponse): string {
  const message = messageResponse.message;
  const forwardMessageList = (message.extra as any)?.forwardMessage?.messageList;
  const forwardText = Array.isArray(forwardMessageList)
    ? forwardMessageList
        .map(item => (typeof item?.message?.content === "string" ? item.message.content : ""))
        .filter(Boolean)
        .join(" ")
    : "";

  return [
    typeof message.customRoleName === "string" ? message.customRoleName : "",
    typeof message.content === "string" ? message.content : "",
    forwardText,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

interface RegexSelectWindowProps {
  sourceMessages: ChatMessageResponse[];
  onApplyFilter: (matchedIds: Set<number>) => void;
  onClose: () => void;
}

export default function RegexSelectWindow({ sourceMessages, onApplyFilter, onClose }: RegexSelectWindowProps) {
  const [regexPattern, setRegexPattern] = useState("");
  const regexFlags = "i";
  const [filterOutOfCharacterSpeech, setFilterOutOfCharacterSpeech] = useState(false);
  const [filterAction, setFilterAction] = useState<FilterAction>("remove");

  // 正则匹配器
  const regexMatcher = useMemo<{ test: ((s: string) => boolean) | null; error: string | null }>(() => {
    const trimmed = regexPattern.trim();
    if (!trimmed)
      return { test: null, error: null };
    try {
      const regex = new RegExp(trimmed, sanitizeRegexFlags(regexFlags));
      return { test: (s: string) => regex.test(s), error: null };
    }
    catch (e) {
      return { test: null, error: e instanceof Error ? e.message : "正则表达式不合法" };
    }
  }, [regexPattern, regexFlags]);

  // 匹配的消息 ID
  const matchedMessageIds = useMemo(() => {
    if (!regexMatcher.test && !filterOutOfCharacterSpeech)
      return [] as number[];

    return sourceMessages
      .filter((msg) => {
        const rawContent = typeof msg.message.content === "string" ? msg.message.content : "";
        const isOutOfCharacterMatched = filterOutOfCharacterSpeech
          ? rawContent.trimStart().startsWith("(") || rawContent.trimStart().startsWith("（")
          : false;

        const text = extractSearchText(msg);
        const isRegexMatched = regexMatcher.test ? regexMatcher.test(text) : false;

        return isOutOfCharacterMatched || isRegexMatched;
      })
      .map(m => m.message.messageId)
      .filter((id): id is number => typeof id === "number" && id > 0);
  }, [filterOutOfCharacterSpeech, regexMatcher, sourceMessages]);

  const matchedMessages = useMemo(() => {
    const idSet = new Set(matchedMessageIds);
    return sourceMessages.filter(m => idSet.has(m.message.messageId));
  }, [matchedMessageIds, sourceMessages]);

  const preview = useMemo(() => matchedMessages.slice(0, 6), [matchedMessages]);

  const hasInput = regexPattern.trim() !== "" || filterOutOfCharacterSpeech;
  const canApply = matchedMessageIds.length > 0 && (!regexMatcher.error || filterOutOfCharacterSpeech);

  const handleApply = useCallback(() => {
    if (filterAction === "remove") {
      onApplyFilter(new Set(matchedMessageIds));
    }
    else {
      const matchedSet = new Set(matchedMessageIds);
      const nonMatchedIds = sourceMessages
        .map(m => m.message.messageId)
        .filter((id): id is number => typeof id === "number" && id > 0 && !matchedSet.has(id));
      onApplyFilter(new Set(nonMatchedIds));
    }
    onClose();
  }, [filterAction, matchedMessageIds, onApplyFilter, onClose, sourceMessages]);

  return (
    <div className="w-[min(92vw,600px)] p-6 space-y-4">
      {/* 标题 */}
      <div>
        <h2 className="text-lg font-semibold">消息筛选</h2>
        <p className="text-sm text-base-content/60 mt-1">
          从已选的
          {" "}
          {sourceMessages.length}
          {" "}
          条消息中筛选
        </p>
      </div>

      {/* 正则搜索 */}
      <label className="input input-bordered flex items-center gap-2 w-full">
        <svg className="w-4 h-4 text-base-content/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          className="grow bg-transparent outline-none"
          value={regexPattern}
          onChange={e => setRegexPattern(e.target.value)}
          placeholder="输入正则表达式…"
        />
      </label>

      {/* 场外发言过滤 */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={filterOutOfCharacterSpeech}
          onChange={e => setFilterOutOfCharacterSpeech(e.target.checked)}
        />
        <span className="text-sm">场外发言过滤</span>
      </label>
      <p className="-mt-2 text-xs text-base-content/50">
        开启后，所有以
        {" "}
        <code>(</code>
        {" "}
        和
        {" "}
        <code>（</code>
        {" "}
        为开头的发言都将被过滤
      </p>

      {/* 正则错误提示 */}
      {regexMatcher.error && (
        <div className="alert alert-error py-2 px-3 text-sm">
          <span>
            表达式错误：
            {regexMatcher.error}
          </span>
        </div>
      )}

      {/* 操作方式 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium whitespace-nowrap">操作：</span>
        <div className="join">
          <button
            type="button"
            className={`join-item btn btn-sm ${filterAction === "remove" ? "btn-error text-error-content" : "btn-ghost border border-base-300"}`}
            onClick={() => setFilterAction("remove")}
          >
            剔除匹配
          </button>
          <button
            type="button"
            className={`join-item btn btn-sm ${filterAction === "keep" ? "btn-success text-success-content" : "btn-ghost border border-base-300"}`}
            onClick={() => setFilterAction("keep")}
          >
            仅保留匹配
          </button>
        </div>
      </div>

      {/* 预览区 */}
      <div className="rounded-xl border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            {filterAction === "remove" ? "将被剔除" : "将被保留"}
          </span>
          <span className={`badge badge-sm ${filterAction === "remove" ? "badge-error" : "badge-success"}`}>
            {matchedMessageIds.length}
            {" "}
            条匹配
          </span>
        </div>
        <div className="mt-3 max-h-48 overflow-auto space-y-2 pr-1">
          {preview.length === 0 && (
            <div className="text-sm text-base-content/50 py-5 text-center">
              {hasInput ? "没有匹配的消息" : "输入正则表达式或开启场外发言过滤"}
            </div>
          )}
          {preview.map(item => (
            <div key={item.message.messageId} className="rounded-lg bg-base-100 px-3 py-2">
              <PreviewMessage message={item.message} />
            </div>
          ))}
          {matchedMessageIds.length > preview.length && (
            <div className="text-xs text-base-content/40 text-center pt-1">
              还有
              {" "}
              {matchedMessageIds.length - preview.length}
              {" "}
              条未展示
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filterAction === "remove" ? "btn-error" : "btn-success"}`}
          disabled={!canApply}
          onClick={handleApply}
        >
          {canApply
            ? (filterAction === "remove"
                ? `剔除 ${matchedMessageIds.length} 条`
                : `保留 ${matchedMessageIds.length} 条，剔除 ${sourceMessages.length - matchedMessageIds.length} 条`)
            : "应用筛选"}
        </button>
      </div>
    </div>
  );
}
