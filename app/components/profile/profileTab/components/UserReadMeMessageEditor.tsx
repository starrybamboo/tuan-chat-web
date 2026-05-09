import type { UserReadMeMessageNode } from "./userReadMeMessageDoc";

import { WarningCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { getRemoteSnapshot, setRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { getCachedDocSnapshot, setCachedDocSnapshot } from "@/components/chat/infra/blocksuite/document/docSnapshotCache";
import { TextEnhanceRenderer } from "@/components/common/textEnhanceRenderer";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import {
  createUserReadMeNode,
  createUserReadMeSnapshot,
  decodeUserReadMeNodes,
  ensureUserReadMeNodes,
  mergeUserReadMeNodeBackward,
  mergeUserReadMeNodeForward,
  serializeUserReadMeNodes,
  splitUserReadMeNode,
} from "./userReadMeMessageDoc";

interface FocusRequest {
  nodeId: string;
  caret: number;
}

interface UserReadMeMessageEditorProps {
  userId: number;
  isOwner: boolean;
  docId: string;
}

function isSelectionCollapsed(textarea: HTMLTextAreaElement) {
  return textarea.selectionStart === textarea.selectionEnd;
}

function ReadOnlyNode({ node }: { node: UserReadMeMessageNode }) {
  if (node.messageType === MESSAGE_TYPE.INTRO_TEXT) {
    return (
      <div className="rounded-md bg-black px-4 py-2 text-white">
        <TextEnhanceRenderer content={node.content} className="whitespace-pre-wrap break-words text-white" />
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words px-1 py-0.5 text-base-content/90">
      <TextEnhanceRenderer content={node.content} />
    </div>
  );
}

function EditableNode({
  node,
  registerTextarea,
  onChange,
  onKeyDown,
}: {
  node: UserReadMeMessageNode;
  registerTextarea: (nodeId: string, element: HTMLTextAreaElement | null) => void;
  onChange: (nodeId: string, value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>, nodeId: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, 40)}px`;
  }, []);

  useLayoutEffect(() => {
    syncHeight();
  }, [node.content, syncHeight]);

  return (
    <div className="relative">
      <textarea
        ref={(element) => {
          textareaRef.current = element;
          registerTextarea(node.nodeId, element);
        }}
        value={node.content}
        rows={1}
        placeholder=""
        spellCheck={false}
        className={`block w-full resize-none overflow-hidden border border-transparent bg-transparent px-1 py-1 text-base leading-7 caret-primary transition focus:border-transparent focus:outline-none focus:ring-0 ${
          node.messageType === MESSAGE_TYPE.INTRO_TEXT
            ? "rounded-md bg-black text-white placeholder:text-white/30"
            : "rounded-md text-base-content"
        }`}
        onChange={event => onChange(node.nodeId, event.target.value)}
        onInput={syncHeight}
        onKeyDown={event => onKeyDown(event, node.nodeId)}
      />
    </div>
  );
}

/**
 * 个人主页 ReadMe 的线性消息流编辑器。
 * 当前只在 user readme 页面启用，用来验证 message-stream 文档视图。
 */
export default function UserReadMeMessageEditor({
  userId,
  isOwner,
  docId,
}: UserReadMeMessageEditorProps) {
  const [nodes, setNodes] = useState<UserReadMeMessageNode[]>(() => ensureUserReadMeNodes([]));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaMapRef = useRef(new Map<string, HTMLTextAreaElement>());
  const pendingFocusRef = useRef<FocusRequest | null>(null);
  const readyRef = useRef(false);
  const lastSavedSerializedRef = useRef("");
  const saveErrorToastRef = useRef(0);

  const serializedNodes = useMemo(() => serializeUserReadMeNodes(nodes), [nodes]);

  const applyFocusRequest = useCallback((focusRequest: FocusRequest) => {
    const textarea = textareaMapRef.current.get(focusRequest.nodeId);
    if (!textarea) {
      return false;
    }
    const caret = Math.max(0, Math.min(focusRequest.caret, textarea.value.length));
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    return true;
  }, []);

  const requestFocus = useCallback((focusRequest: FocusRequest) => {
    if (applyFocusRequest(focusRequest)) {
      pendingFocusRef.current = null;
      return;
    }
    pendingFocusRef.current = focusRequest;
  }, [applyFocusRequest]);

  const registerTextarea = useCallback((nodeId: string, element: HTMLTextAreaElement | null) => {
    if (element) {
      textareaMapRef.current.set(nodeId, element);
      return;
    }
    textareaMapRef.current.delete(nodeId);
  }, []);

  const updateNodeContent = useCallback((nodeId: string, value: string) => {
    setNodes((prev) => {
      const index = prev.findIndex(node => node.nodeId === nodeId);
      if (index < 0 || prev[index].content === value) {
        return prev;
      }
      const next = [...prev];
      next[index] = {
        ...next[index],
        content: value,
      };
      return next;
    });
  }, []);

  const moveFocusToAdjacent = useCallback((nodeId: string, direction: -1 | 1, caret: "start" | "end") => {
    const index = nodes.findIndex(node => node.nodeId === nodeId);
    const target = nodes[index + direction];
    if (!target) {
      return;
    }
    requestFocus({
      nodeId: target.nodeId,
      caret: caret === "start" ? 0 : target.content.length,
    });
  }, [nodes, requestFocus]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>, nodeId: string) => {
    const textarea = event.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setNodes((prev) => {
        const result = splitUserReadMeNode(prev, {
          nodeId,
          selectionStart,
          selectionEnd,
        });
        requestFocus(result.focus);
        return result.nodes;
      });
      return;
    }

    if (event.key === "Backspace" && isSelectionCollapsed(textarea) && selectionStart === 0) {
      const result = mergeUserReadMeNodeBackward(nodes, nodeId);
      if (result) {
        event.preventDefault();
        requestFocus(result.focus);
        setNodes(result.nodes);
      }
      return;
    }

    if (event.key === "Delete" && isSelectionCollapsed(textarea) && selectionEnd === value.length) {
      const result = mergeUserReadMeNodeForward(nodes, nodeId);
      if (result) {
        event.preventDefault();
        requestFocus(result.focus);
        setNodes(result.nodes);
      }
      return;
    }

    if (event.key === "ArrowUp" && isSelectionCollapsed(textarea) && selectionStart === 0) {
      event.preventDefault();
      moveFocusToAdjacent(nodeId, -1, "end");
      return;
    }

    if (event.key === "ArrowDown" && isSelectionCollapsed(textarea) && selectionEnd === value.length) {
      event.preventDefault();
      moveFocusToAdjacent(nodeId, 1, "start");
    }
  }, [moveFocusToAdjacent, nodes, requestFocus]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      setLoadState("loading");
      setErrorMessage("");
      try {
        const cachedSnapshot = getCachedDocSnapshot(docId);
        const snapshot = cachedSnapshot ?? await getRemoteSnapshot({
          entityType: "user",
          entityId: userId,
          docType: "readme",
        });
        if (cancelled) {
          return;
        }
        if (snapshot) {
          setCachedDocSnapshot(docId, snapshot);
        }
        const decodedNodes = ensureUserReadMeNodes(decodeUserReadMeNodes(snapshot));
        lastSavedSerializedRef.current = serializeUserReadMeNodes(decodedNodes);
        readyRef.current = true;
        setNodes(decodedNodes);
        setLoadState("ready");
      }
      catch (error) {
        if (cancelled) {
          return;
        }
        readyRef.current = true;
        setNodes(ensureUserReadMeNodes([]));
        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "加载失败");
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [docId, userId]);

  useLayoutEffect(() => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }
    if (applyFocusRequest(pendingFocus)) {
      pendingFocusRef.current = null;
    }
  }, [applyFocusRequest, nodes]);

  useEffect(() => {
    if (!isOwner || !readyRef.current || loadState !== "ready") {
      return;
    }
    if (serializedNodes === lastSavedSerializedRef.current) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const snapshot = createUserReadMeSnapshot(nodes);
      void setRemoteSnapshot({
        entityType: "user",
        entityId: userId,
        docType: "readme",
        snapshot,
      }).then(() => {
        setCachedDocSnapshot(docId, snapshot);
        lastSavedSerializedRef.current = serializedNodes;
      }).catch((error) => {
        console.error("[UserReadMe] save failed", error);
        const now = Date.now();
        if (now - saveErrorToastRef.current > 2500) {
          toast.error("个人主页保存失败");
          saveErrorToastRef.current = now;
        }
      });
    }, 500);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [docId, isOwner, loadState, nodes, serializedNodes, userId]);

  const handleAppendParagraph = useCallback(() => {
    const nextNode = createUserReadMeNode();
    setNodes(prev => [...prev, nextNode]);
    requestFocus({
      nodeId: nextNode.nodeId,
      caret: 0,
    });
  }, [requestFocus]);

  if (loadState === "loading") {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-md bg-base-100/50">
        <span className="loading loading-spinner loading-md text-base-content/50"></span>
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-md bg-transparent">
      {loadState === "error" && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-warning">
          <WarningCircleIcon className="h-4 w-4" />
          <span>{errorMessage || "加载失败"}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
          {isOwner
            ? nodes.map(node => (
                <EditableNode
                  key={node.nodeId}
                  node={node}
                  registerTextarea={registerTextarea}
                  onChange={updateNodeContent}
                  onKeyDown={handleKeyDown}
                />
              ))
            : nodes.filter(node => node.content.trim().length > 0).map(node => (
                <ReadOnlyNode key={node.nodeId} node={node} />
              ))}
          {isOwner && (
            <button
              type="button"
              className="mt-1 h-10 rounded-md border border-dashed border-transparent bg-transparent text-sm text-base-content/35 transition hover:border-base-300/70 hover:text-base-content/60 focus:outline-none focus:ring-0"
              onClick={handleAppendParagraph}
              aria-label="追加段落"
            >
              +
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
