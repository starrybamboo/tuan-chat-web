import type { DocMode } from "@blocksuite/affine/model";
import type { DocModeProvider } from "@blocksuite/affine/shared/services";
import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/base64";

import { createEmbeddedAffineEditor } from "@/components/chat/infra/blocksuite/embedded/createEmbeddedAffineEditor";
import {
  getOrCreateSpaceDocStore,
  getOrCreateSpaceWorkspaceRuntime,
} from "@/components/chat/infra/blocksuite/runtime/spaceWorkspace";
import { ensureBlocksuiteCoreElementsDefined } from "@/components/chat/infra/blocksuite/spec/coreElements";
import { Text } from "@blocksuite/store";

import { useEffect, useMemo, useRef } from "react";
import { Subscription } from "rxjs";

export interface BlocksuiteUserReadmeActions {
  /** 获取可落库的字符串（JSON 包裹 base64 Yjs update） */
  getPersistedContent: () => string;
}

interface PersistedBlocksuiteSnapshotV1 {
  v: 1;
  kind: "blocksuite";
  updateB64: string;
}

function tryParsePersistedSnapshot(raw: string | null | undefined): PersistedBlocksuiteSnapshotV1 | null {
  if (!raw)
    return null;

  // 兼容：后端可能存的是普通字符串（旧 Markdown）
  const trimmed = raw.trim();
  if (!trimmed)
    return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<PersistedBlocksuiteSnapshotV1>;
    if (parsed?.v === 1 && parsed?.kind === "blocksuite" && typeof parsed.updateB64 === "string" && parsed.updateB64) {
      return { v: 1, kind: "blocksuite", updateB64: parsed.updateB64 };
    }
  }
  catch {
    // ignore
  }

  return null;
}

function buildPersistedSnapshot(updateB64: string): string {
  const payload: PersistedBlocksuiteSnapshotV1 = { v: 1, kind: "blocksuite", updateB64 };
  return JSON.stringify(payload);
}

function defaultReadmePlainText(isOwner: boolean): string {
  if (!isOwner)
    return "该用户还没有撰写个人简介。";

  return [
    "👋 欢迎来到我的主页",
    "",
    "还没有写下个人简介？点击右上角「编辑」开始介绍自己吧！",
    "",
    "你可以写：",
    "- 自我介绍和专业背景",
    "- 当前项目和研究方向",
    "- 技术栈和擅长领域",
    "- 寻求的合作机会",
    "- 联系方式",
  ].join("\n");
}

export default function BlocksuiteUserReadme(props: {
  userId: number;
  isOwner: boolean;
  content: string | null | undefined;
  editable: boolean;
  onActionsChange?: (actions: BlocksuiteUserReadmeActions | null) => void;
  className?: string;
}) {
  const { userId, isOwner, content, editable, onActionsChange, className } = props;

  const workspaceId = `user:${userId}`;
  const docId = `user:${userId}:readme`;

  const hostContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);

  const docModeProvider: DocModeProvider = useMemo(() => {
    const listeners = new Set<(m: DocMode) => void>();
    let mode: DocMode = "page";

    return {
      setEditorMode: (m: DocMode) => {
        mode = m;
        for (const fn of listeners) fn(m);
      },
      getEditorMode: () => mode,
      setPrimaryMode: (m: DocMode) => {
        mode = m;
        for (const fn of listeners) fn(m);
      },
      getPrimaryMode: () => mode,
      togglePrimaryMode: () => {
        mode = mode === "page" ? "edgeless" : "page";
        for (const fn of listeners) fn(mode);
        return mode;
      },
      onPrimaryModeChange: (handler: (m: DocMode) => void) => {
        listeners.add(handler);
        const subscription = new Subscription();
        subscription.add(() => listeners.delete(handler));
        return subscription;
      },
    };
  }, []);

  const actions: BlocksuiteUserReadmeActions = useMemo(() => {
    return {
      getPersistedContent: () => {
        const ws = getOrCreateSpaceWorkspaceRuntime(workspaceId) as any;
        const update = ws.encodeDocAsUpdate(docId) as Uint8Array;
        return buildPersistedSnapshot(uint8ArrayToBase64(update));
      },
    };
  }, [docId, workspaceId]);

  useEffect(() => {
    onActionsChange?.(actions);
    return () => {
      onActionsChange?.(null);
    };
  }, [actions, onActionsChange]);

  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container)
      return;

    ensureBlocksuiteCoreElementsDefined();

    const ws = getOrCreateSpaceWorkspaceRuntime(workspaceId) as any;

    // 为了确保「取消编辑」不污染下次打开，这里每次 mount 都重置 doc。
    try {
      ws.removeDoc?.(docId);
    }
    catch {
      // ignore
    }

    const snapshot = tryParsePersistedSnapshot(content);
    if (snapshot?.updateB64) {
      try {
        ws.restoreDocFromUpdate({ docId, update: base64ToUint8Array(snapshot.updateB64) });
      }
      catch {
        // ignore
      }
    }

    const store = getOrCreateSpaceDocStore({ workspaceId, docId }) as any;

    // 旧数据兼容：如果 content 不是 blocksuite snapshot，就把它当纯文本写入首段。
    if (!snapshot) {
      const rawText = (content ?? "").trim() || defaultReadmePlainText(isOwner);
      try {
        const paragraphs = store.getModelsByFlavour?.("affine:paragraph") as any[] | undefined;
        const first = paragraphs?.[0];
        if (first) {
          store.updateBlock(first, { text: new Text(rawText) });
        }
      }
      catch {
        // ignore
      }
    }

    const editor = createEmbeddedAffineEditor({
      store,
      workspace: ws,
      docModeProvider,
      spaceId: -1,
      autofocus: editable,
    });

    (editor as any).style.display = "block";
    (editor as any).style.width = "100%";
    (editor as any).style.minHeight = "8rem";
    (editor as any).style.height = "auto";

    // 只读模式：尽量用组件自身的只读开关（如不可用再降级）。
    if (!editable) {
      try {
        (editor as any).readOnly = true;
        (editor as any).readonly = true;
        (editor as any).setAttribute?.("readonly", "true");
      }
      catch {
        // ignore
      }

      // 最稳妥的兜底：避免非编辑态被误操作改动内容。
      // （滚动由页面本身承担，通常不依赖 editor 内部滚动。）
      (editor as any).style.pointerEvents = "none";
    }

    editorRef.current = editor as unknown as HTMLElement;
    container.replaceChildren(editor as unknown as Node);

    // 强制 page 模式（个人简介场景不暴露画布切换按钮）
    try {
      if (typeof (editor as any).switchEditor === "function") {
        (editor as any).switchEditor("page");
      }
      else {
        (editor as any).mode = "page";
      }
    }
    catch {
      // ignore
    }

    return () => {
      editorRef.current = null;
      container.replaceChildren();
    };
  }, [content, docId, docModeProvider, editable, isOwner, workspaceId]);

  return (
    <div className={className}>
      <div ref={hostContainerRef} className="w-full" />
    </div>
  );
}
