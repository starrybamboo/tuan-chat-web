import type { MessageEditorController } from "./runtime/messageEditorController";
import type { DescriptionEntityType } from "@/components/chat/infra/doc/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/doc/document/docHeader";
import type { MessageDraft } from "@/types/messageDraft";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { parseDescriptionDocId } from "@/components/chat/infra/doc/description/descriptionDocId";
import { getRemoteSnapshot, prewarmRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/doc/description/descriptionDocRemote";
import { normalizeBlocksuiteDocHeader } from "@/components/chat/infra/doc/document/docHeader";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/doc/document/docSnapshotCache";
import { useFloatingSelectionToolbar } from "@/components/common/floatingSelectionToolbar";
import MessageContentRenderer from "../chat/message/messageContentRenderer";

import { MessageEditorTextBlock } from "./components/MessageEditorTextBlock";
import { MessageEditorToolbar } from "./components/MessageEditorToolbar";
import { createMessageEditorSnapshot, decodeMessageEditorMessages } from "./model/messageEditorCodec";
import {
  createMessageEditorTextDraft,
  ensureMessageEditorMessages,
  getMessageEditorBlockId,
  getMessageEditorBlockType,
} from "./model/messageEditorTransforms";
import { createMessageEditorController } from "./runtime/messageEditorController";
import { MessageEditorEventBus } from "./runtime/messageEditorEventBus";
import { createMessageEditorRegistry } from "./runtime/messageEditorRegistry";
import {
  createMessageEditorSelection,
  resolveMessageEditorSelectionFromRange,
  restoreMessageEditorSelection,
} from "./runtime/messageEditorSelection";

interface MessageEditorProps {
  className?: string;
  coverUrl?: string;
  docId?: string;
  excerpt?: string;
  intentPrewarm?: boolean;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  readOnly?: boolean;
  spaceId?: number;
  tcHeader?: {
    enabled?: boolean;
    fallbackTitle?: string;
    fallbackImageUrl?: string;
    fallbackImageFileId?: number;
    fallbackOriginalImageFileId?: number;
    fallbackImageMediaType?: string;
  };
  title?: string;
  workspaceId?: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function normalizeEditableText(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00A0/g, " ");
}

function isSelectionAtStart(range: Range, blockElement: HTMLElement) {
  const selectionText = normalizeEditableText(range.toString());
  const prefixRange = document.createRange();
  prefixRange.selectNodeContents(blockElement);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  return prefixRange.toString().length === 0 && selectionText.length === 0;
}

function isSelectionAtEnd(range: Range, blockElement: HTMLElement) {
  const suffixRange = document.createRange();
  suffixRange.selectNodeContents(blockElement);
  suffixRange.setStart(range.endContainer, range.endOffset);
  return suffixRange.toString().length === 0 && normalizeEditableText(range.toString()).length === 0;
}

/**
 * 基于 message-stream 的线性文档编辑器。
 */
export default function MessageEditor({
  className,
  coverUrl,
  docId,
  excerpt: _excerpt,
  intentPrewarm = false,
  onTcHeaderChange,
  readOnly = false,
  spaceId: _spaceId,
  tcHeader,
  title,
  workspaceId: _workspaceId,
}: MessageEditorProps) {
  const frameClassName = className ?? "h-full min-h-0 rounded-md";
  const resolvedTitle = title?.trim() || tcHeader?.fallbackTitle?.trim() || "消息";
  const resolvedCoverUrl = coverUrl || tcHeader?.fallbackImageUrl || "";
  const resolvedDocId = docId?.trim() || undefined;
  const remoteKey = useMemo(() => {
    return resolvedDocId ? parseDescriptionDocId(resolvedDocId) : null;
  }, [resolvedDocId]);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const blockRefsRef = useRef(new Map<string, HTMLDivElement>());
  const messagesRef = useRef<MessageDraft[]>([]);
  const controllerRef = useRef<MessageEditorController | null>(null);
  const restoreSelectionRef = useRef<{
    blockId?: string;
    caret?: number;
    selection?: ReturnType<typeof createMessageEditorSelection>;
  } | null>(null);
  const [messages, setMessages] = useState<MessageDraft[]>(() => ensureMessageEditorMessages([]));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [ready, setReady] = useState(!resolvedDocId);
  const registry = useMemo(() => createMessageEditorRegistry(), []);
  const eventBus = useMemo(() => new MessageEditorEventBus(), []);
  const header = useMemo(() => {
    return normalizeBlocksuiteDocHeader({
      title: resolvedTitle,
      imageUrl: resolvedCoverUrl,
      imageFileId: tcHeader?.fallbackImageFileId,
      originalImageFileId: tcHeader?.fallbackOriginalImageFileId,
      imageMediaType: tcHeader?.fallbackImageMediaType,
    });
  }, [
    resolvedCoverUrl,
    resolvedTitle,
    tcHeader?.fallbackImageFileId,
    tcHeader?.fallbackImageMediaType,
    tcHeader?.fallbackOriginalImageFileId,
  ]);
  const lastNotifyDigestRef = useRef("");
  const lastSavedSerializedRef = useRef("");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setMessagesWithRef = useCallback((updater: (previous: MessageDraft[]) => MessageDraft[]) => {
    setMessages((previous) => {
      const next = ensureMessageEditorMessages(updater(previous));
      messagesRef.current = next;
      return next;
    });
  }, []);

  const getCurrentMessages = useCallback(() => {
    return messagesRef.current;
  }, []);

  useEffect(() => {
    controllerRef.current = createMessageEditorController({
      eventBus,
      registry,
      getMessages: getCurrentMessages,
      setMessages: setMessagesWithRef,
    });
  }, [eventBus, getCurrentMessages, registry, setMessagesWithRef]);

  const { toolbarRef, isFloatingVisible, toolbarPos, savedSelectionRef, hideToolbar } = useFloatingSelectionToolbar({
    visible: !readOnly,
    resolveEditorElement: useCallback((range: Range) => {
      const root = editorRootRef.current;
      if (!root) {
        return null;
      }
      const selection = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, range);
      if (!selection || selection.collapsed) {
        return null;
      }
      return root;
    }, [registry]),
  });

  const restorePendingSelection = useCallback(() => {
    const root = editorRootRef.current;
    const pending = restoreSelectionRef.current;
    if (!root || !pending) {
      return;
    }

    restoreSelectionRef.current = null;
    if (pending.selection) {
      restoreMessageEditorSelection(root, pending.selection);
      return;
    }

    if (pending.blockId && typeof pending.caret === "number") {
      const selection = createMessageEditorSelection(messagesRef.current, registry, {
        blockId: pending.blockId,
        offset: pending.caret,
      }, {
        blockId: pending.blockId,
        offset: pending.caret,
      });
      if (selection) {
        restoreMessageEditorSelection(root, selection);
      }
    }
  }, [registry]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    queueMicrotask(restorePendingSelection);
  }, [messages, ready, restorePendingSelection]);

  useEffect(() => {
    if (!resolvedDocId || !onTcHeaderChange) {
      return;
    }
    const parsed = parseDescriptionDocId(resolvedDocId);
    const digest = JSON.stringify({
      docId: resolvedDocId,
      header,
      entityType: parsed?.entityType,
      entityId: parsed?.entityId,
    });
    if (lastNotifyDigestRef.current === digest) {
      return;
    }
    lastNotifyDigestRef.current = digest;
    onTcHeaderChange({
      docId: resolvedDocId,
      entityType: parsed?.entityType as DescriptionEntityType | undefined,
      entityId: parsed?.entityId,
      header,
    });
  }, [header, onTcHeaderChange, resolvedDocId]);

  useEffect(() => {
    let cancelled = false;
    restoreSelectionRef.current = null;
    hideToolbar();

    if (!resolvedDocId || !remoteKey) {
      const fallback = ensureMessageEditorMessages(messagesRef.current.length > 0 ? messagesRef.current : [createMessageEditorTextDraft()]);
      messagesRef.current = fallback;
      lastSavedSerializedRef.current = createMessageEditorSnapshot(fallback).updateB64;
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setMessages(fallback);
        setLoadError("");
        setSaveState("idle");
        setReady(true);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setReady(false);
      }
    });
    const cached = getCachedDocSnapshot(resolvedDocId);
    if (cached) {
      const decoded = ensureMessageEditorMessages(decodeMessageEditorMessages(cached));
      messagesRef.current = decoded;
      lastSavedSerializedRef.current = cached.updateB64;
      queueMicrotask(() => {
        if (cancelled) {
          return;
        }
        setMessages(decoded);
        setLoadError("");
        setSaveState("idle");
      });
    }

    if (intentPrewarm) {
      prewarmRemoteSnapshot(remoteKey).catch(() => {});
    }

    getRemoteSnapshot(remoteKey).then((snapshot) => {
      if (cancelled) {
        return;
      }
      setCachedDocSnapshot(resolvedDocId, snapshot);
      const decoded = ensureMessageEditorMessages(decodeMessageEditorMessages(snapshot));
      messagesRef.current = decoded;
      setMessages(decoded);
      lastSavedSerializedRef.current = snapshot?.updateB64 ?? "";
      setLoadError("");
      setSaveState("idle");
      setReady(true);
    }).catch((error) => {
      if (cancelled) {
        return;
      }
      setLoadError(error instanceof Error ? error.message : String(error));
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [hideToolbar, intentPrewarm, remoteKey, resolvedDocId]);

  useEffect(() => {
    if (!ready || readOnly || !resolvedDocId || !remoteKey) {
      return;
    }

    const snapshot = createMessageEditorSnapshot(messages);
    if (snapshot.updateB64 === lastSavedSerializedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveState("saving");
      setRemoteSnapshot({
        ...remoteKey,
        snapshot,
      }).then(() => {
        lastSavedSerializedRef.current = snapshot.updateB64;
        setCachedDocSnapshot(resolvedDocId, snapshot);
        setSaveState("saved");
      }).catch(() => {
        setSaveState("error");
      });
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [messages, readOnly, ready, remoteKey, resolvedDocId]);

  const resolveEditorSelection = useCallback((preferSaved = false) => {
    const root = editorRootRef.current;
    if (!root) {
      return null;
    }

    const selection = window.getSelection();
    if (!preferSaved && selection && selection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, selection.getRangeAt(0));
      if (resolved) {
        eventBus.emit("selectionChanged", {
          blockIds: resolved.blockIds,
          multiBlock: resolved.multiBlock,
        });
        return resolved;
      }
    }

    const saved = savedSelectionRef.current;
    if (!saved) {
      return null;
    }

    const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, saved.range);
    if (resolved) {
      eventBus.emit("selectionChanged", {
        blockIds: resolved.blockIds,
        multiBlock: resolved.multiBlock,
      });
    }
    return resolved;
  }, [eventBus, registry, savedSelectionRef]);

  const registerBlockRef = useCallback((blockId: string, node: HTMLDivElement | null) => {
    if (node) {
      blockRefsRef.current.set(blockId, node);
      return;
    }
    blockRefsRef.current.delete(blockId);
  }, []);

  const handleTextInput = useCallback((blockId: string, nextContent: string) => {
    const root = editorRootRef.current;
    const selection = window.getSelection();
    let caret: number | null = null;
    if (root && selection && selection.rangeCount > 0) {
      const resolved = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, selection.getRangeAt(0));
      if (resolved && !resolved.multiBlock) {
        caret = resolved.focus.offset;
      }
    }

    controllerRef.current?.updateTextContent(blockId, nextContent);
    if (caret != null) {
      restoreSelectionRef.current = {
        blockId,
        caret,
      };
    }
  }, [registry]);

  const handleTextKeyDown = useCallback((blockId: string, event: React.KeyboardEvent<HTMLDivElement>) => {
    const root = editorRootRef.current;
    const selection = window.getSelection();
    const blockElement = blockRefsRef.current.get(blockId);
    if (!root || !selection || selection.rangeCount === 0 || !blockElement) {
      return;
    }

    const range = selection.getRangeAt(0);
    const editorSelection = resolveMessageEditorSelectionFromRange(root, messagesRef.current, registry, range);
    if (!editorSelection) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const focus = controllerRef.current?.splitAtSelection(editorSelection);
      if (focus) {
        restoreSelectionRef.current = focus;
      }
      return;
    }

    if (event.key === "Backspace" && editorSelection.collapsed && isSelectionAtStart(range, blockElement)) {
      event.preventDefault();
      const focus = controllerRef.current?.mergeBackward(blockId);
      if (focus) {
        restoreSelectionRef.current = focus;
      }
      return;
    }

    if (event.key === "Delete" && editorSelection.collapsed && isSelectionAtEnd(range, blockElement)) {
      event.preventDefault();
      const focus = controllerRef.current?.mergeForward(blockId);
      if (focus) {
        restoreSelectionRef.current = focus;
      }
    }
  }, [registry]);

  const applyInlineMark = useCallback((type: "bold" | "italic" | "code" | "highlight") => {
    const selection = resolveEditorSelection(true);
    if (!selection || selection.collapsed) {
      return;
    }
    controllerRef.current?.applyInlineMark(selection, type);
    restoreSelectionRef.current = { selection };
  }, [resolveEditorSelection]);

  const applyColorMark = useCallback((color?: string) => {
    const selection = resolveEditorSelection(true);
    if (!selection || selection.collapsed) {
      return;
    }
    controllerRef.current?.applyColorMark(selection, color);
    restoreSelectionRef.current = { selection };
  }, [resolveEditorSelection]);

  const applyBlockType = useCallback((blockType: "paragraph" | "heading1" | "heading2" | "heading3" | "intro") => {
    const selection = resolveEditorSelection(true);
    if (!selection) {
      if (!activeBlockId) {
        return;
      }
      const collapsed = createMessageEditorSelection(messagesRef.current, registry, {
        blockId: activeBlockId,
        offset: 0,
      }, {
        blockId: activeBlockId,
        offset: 0,
      });
      if (!collapsed) {
        return;
      }
      controllerRef.current?.applyBlockType(collapsed, blockType);
      return;
    }

    controllerRef.current?.applyBlockType(selection, blockType);
    restoreSelectionRef.current = selection.collapsed ? null : { selection };
  }, [activeBlockId, registry, resolveEditorSelection]);

  const atomicMessages = useMemo(() => {
    return messages.map((message) => {
      return {
        blockId: getMessageEditorBlockId(message),
        message,
        blockType: getMessageEditorBlockType(message),
        driver: registry.resolve(message),
      };
    });
  }, [messages, registry]);

  let statusLabel = "编辑中";
  if (readOnly) {
    statusLabel = "只读";
  }
  else if (!ready) {
    statusLabel = "载入中";
  }
  else if (saveState === "saving") {
    statusLabel = "保存中";
  }
  else if (saveState === "saved") {
    statusLabel = "已保存";
  }
  else if (saveState === "error") {
    statusLabel = "未保存";
  }

  return (
    <div className={`${frameClassName} overflow-hidden border border-base-300 bg-base-100`}>
      <div className="flex h-full min-h-0 flex-col">
        {resolvedCoverUrl
          ? (
              <div className="h-40 w-full shrink-0 overflow-hidden border-b border-base-300 bg-base-200">
                <img className="h-full w-full object-cover" src={resolvedCoverUrl} alt={resolvedTitle} />
              </div>
            )
          : null}

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-base-300 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-base font-medium text-base-content">{resolvedTitle}</div>
              {resolvedDocId
                ? (
                    <div className="truncate font-mono text-xs text-base-content/45">
                      {resolvedDocId}
                    </div>
                  )
                : null}
            </div>
            <div className="rounded-md border border-base-300 px-2 py-1 text-xs text-base-content/55">
              {statusLabel}
            </div>
          </div>

          <div ref={editorRootRef} className="relative min-h-0 flex-1 overflow-auto">
            {!ready && (
              <div className="flex h-full items-center justify-center text-sm text-base-content/45">
                载入中
              </div>
            )}

            {ready && (
              <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-2 px-4 py-5">
                {ready && loadError
                  ? (
                      <div className="rounded-md border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
                        {loadError}
                      </div>
                    )
                  : null}

                {atomicMessages.map(({ blockId, message, driver }) => {
                  if (driver.kind === "text") {
                    return (
                      <div key={blockId} className="group relative">
                        {!readOnly && (
                          <div className="absolute -left-10 top-2 hidden items-center gap-1 opacity-0 transition group-hover:flex group-hover:opacity-100">
                            <button
                              type="button"
                              className="rounded-md border border-base-300 bg-base-100 px-2 py-1 text-[11px] text-base-content/65 transition hover:border-primary/40 hover:text-base-content"
                              onClick={() => controllerRef.current?.moveBlock(blockId, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-base-300 bg-base-100 px-2 py-1 text-[11px] text-base-content/65 transition hover:border-primary/40 hover:text-base-content"
                              onClick={() => controllerRef.current?.moveBlock(blockId, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        <MessageEditorTextBlock
                          active={activeBlockId === blockId}
                          blockId={blockId}
                          message={message}
                          placeholder="输入内容"
                          readOnly={readOnly}
                          registerBlockRef={registerBlockRef}
                          onFocus={(nextBlockId) => {
                            setActiveBlockId(nextBlockId);
                            controllerRef.current?.setActiveBlock(nextBlockId);
                          }}
                          onInput={handleTextInput}
                          onKeyDown={handleTextKeyDown}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={blockId}
                      data-me-block-id={blockId}
                      className="rounded-xl border border-base-300/70 bg-base-100 px-3 py-3 shadow-sm"
                      onClick={() => {
                        setActiveBlockId(blockId);
                        controllerRef.current?.setActiveBlock(blockId);
                      }}
                    >
                      <MessageContentRenderer
                        message={{
                          ...message,
                          content: message.content ?? "",
                          messageType: message.messageType ?? 0,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {!readOnly && (
        <MessageEditorToolbar
          visible={isFloatingVisible}
          position={toolbarPos}
          toolbarRef={toolbarRef}
          onApplyInlineMark={applyInlineMark}
          onApplyBlockType={applyBlockType}
          onApplyColor={applyColorMark}
        />
      )}
    </div>
  );
}
