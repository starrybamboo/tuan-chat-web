import { getOrCreateSpaceDoc } from "@/components/chat/infra/blocksuite/spaceWorkspaceRegistry";
import { AFFINE_EDGELESS_STD_EXTENSIONS, AFFINE_PAGE_STD_EXTENSIONS } from "@/components/chat/infra/blocksuite/spec/affineSpec";
import { ensureBlocksuiteCoreElementsDefined } from "@/components/chat/infra/blocksuite/spec/coreElements";

import "@toeverything/theme/fonts.css";
import "@toeverything/theme/style.css";

import type { DocMode } from "@blocksuite/affine-model";
import { appendParagraphCommand } from "@blocksuite/affine-block-paragraph";
import {
  DocModeExtension,
  type DocModeProvider,
} from "@blocksuite/affine-shared/services";
import { focusBlockEnd } from "@blocksuite/affine-shared/commands";
import { getLastNoteBlock } from "@blocksuite/affine-shared/utils";

import { BlockStdScope } from "@blocksuite/std";
import { TextSelection } from "@blocksuite/std";
import { Subscription } from "rxjs";
import { useEffect, useMemo, useRef, useState } from "react";

function normalizeAppThemeToBlocksuiteTheme(raw: string | null | undefined): "light" | "dark" {
  const v = (raw ?? "").toLowerCase();
  // daisyUI 常见：data-theme="dark" | "light" | "cupcake" | "dracula"...
  if (v.includes("dark") || v.includes("dracula") || v.includes("night")) {
    return "dark";
  }
  return "light";
}

function getCurrentAppTheme(): "light" | "dark" {
  if (typeof document === "undefined") {
    return "light";
  }
  const root = document.documentElement;
  // 优先读取 data-theme，其次读取 class="dark"
  return normalizeAppThemeToBlocksuiteTheme(root.dataset.theme) === "dark" || root.classList.contains("dark")
    ? "dark"
    : "light";
}

export default function BlocksuiteDescriptionEditor(props: {
  spaceId: number;
  docId: string;
  mode?: "page" | "edgeless";
  className?: string;
  variant?: "panel" | "full";
}) {
  const { className, docId, mode = "page", spaceId, variant = "panel" } = props;
  const isFull = variant === "full";

  // blocksuite 的 DocModeService/ThemeService 会读取 editor viewport（.affine-*-viewport）的 data-theme。
  // 这里保持和外部主题同步，并允许 blocksuite 内部通过 DocModeProvider 切换模式。
  const [currentMode, setCurrentMode] = useState<DocMode>(mode);
  const currentModeRef = useRef<DocMode>(mode);

  useEffect(() => {
    currentModeRef.current = mode;
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  const hostContainerRef = useRef<HTMLDivElement | null>(null);

  const docModeProvider: DocModeProvider = useMemo(() => {
    // DocModeProvider 是一个“跨 doc/跨 widget”的服务，这里做最小实现：
    // - editor mode 由 React state 驱动
    // - primary mode 以 docId 为 key 保存在内存（Demo 阶段足够）
    const primaryModeByDocId = new Map<string, DocMode>();
    const listenersByDocId = new Map<string, Set<(m: DocMode) => void>>();

    return {
      setEditorMode: (m: DocMode) => {
        currentModeRef.current = m;
        setCurrentMode(m);
      },
      getEditorMode: () => {
        return currentModeRef.current;
      },
      setPrimaryMode: (m: DocMode, id: string) => {
        primaryModeByDocId.set(id, m);
        const listeners = listenersByDocId.get(id);
        if (listeners) {
          for (const fn of listeners) fn(m);
        }
      },
      getPrimaryMode: (id: string) => {
        return primaryModeByDocId.get(id) ?? "page";
      },
      togglePrimaryMode: (id: string) => {
        const next = (primaryModeByDocId.get(id) ?? "page") === "page" ? "edgeless" : "page";
        primaryModeByDocId.set(id, next);
        const listeners = listenersByDocId.get(id);
        if (listeners) {
          for (const fn of listeners) fn(next);
        }
        return next;
      },
      onPrimaryModeChange: (handler: (m: DocMode) => void, id: string) => {
        let listeners = listenersByDocId.get(id);
        if (!listeners) {
          listeners = new Set();
          listenersByDocId.set(id, listeners);
        }
        listeners.add(handler);

        const subscription = new Subscription();
        subscription.add(() => {
          const set = listenersByDocId.get(id);
          set?.delete(handler);
        });
        return subscription;
      },
    };
  }, []);

  useEffect(() => {
    const container = hostContainerRef.current;
    if (!container)
      return;

    // 主题跟随：把站点主题（data-theme / dark class）同步到 viewport。
    const syncPortalsTheme = (theme: "light" | "dark") => {
      // Slash menu / tooltip 等弹层通过 portal 挂到 body 下的 `.blocksuite-portal` 容器。
      // 如果只给 viewport 设置 data-theme，弹层会继承不到 `[data-theme=...]` 下的 affine 变量，导致“样式不对”。
      // 这里仅给 blocksuite 自己的 portal 容器打标，不改 body/html，避免影响站点（例如 daisyUI 的 data-theme）。
      const portals = document.querySelectorAll<HTMLElement>(".blocksuite-portal");
      for (const el of portals) {
        el.dataset.theme = theme;
      }
    };

    const syncTheme = () => {
      const theme = getCurrentAppTheme();
      container.dataset.theme = theme;
      syncPortalsTheme(theme);
    };
    syncTheme();

    const root = document.documentElement;
    const mo = new MutationObserver(() => syncTheme());
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });

    // 监听 portal 的创建（比如打开 slash menu 时才创建），确保后创建的 portal 也能拿到正确主题。
    const body = document.body;
    const portalMo = new MutationObserver(mutations => {
      const theme = container.dataset.theme === "dark" ? "dark" : "light";

      for (const m of mutations) {
        for (const added of m.addedNodes) {
          if (!(added instanceof HTMLElement)) continue;
          if (added.classList.contains("blocksuite-portal")) {
            added.dataset.theme = theme;
            continue;
          }
          const nested = added.querySelectorAll?.(".blocksuite-portal");
          if (!nested?.length) continue;
          for (const el of nested) {
            if (el instanceof HTMLElement) el.dataset.theme = theme;
          }
        }
      }
    });
    portalMo.observe(body, { childList: true, subtree: true });

    ensureBlocksuiteCoreElementsDefined();

    const store = getOrCreateSpaceDoc({ spaceId, docId });
    const base = currentMode === "edgeless" ? AFFINE_EDGELESS_STD_EXTENSIONS : AFFINE_PAGE_STD_EXTENSIONS;
    // 对齐 AFFiNE：用 DocModeExtension 注入真实 provider（覆盖默认的 DocModeService 占位实现）。
    const extensions = base.concat([DocModeExtension(docModeProvider)]);
    const std = new BlockStdScope({ store, extensions });
    const host = std.render();

    // `editor-host` defaults to `height: 100%` in BlockSuite styles.
    // In our panel layout, the parent may not have an explicit height,
    // so we make the host self-sized with a sane minimum height.
    host.style.height = "auto";
    host.style.minHeight = "8rem";
    host.style.width = "100%";

    container.replaceChildren(host);

    // Dev-only: expose objects for console debugging (mimic blocksuite playground).
    // Usage: `host`, `std`, `blocksuiteStore` in DevTools.
    if (typeof window !== "undefined" && import.meta.env.DEV) {
      const g = globalThis as any;
      g.host = host;
      g.std = std;
      g.blocksuiteStore = store;
      g.TextSelection = TextSelection;
    }

    // 对齐 Blocksuite playground：保证 std.event.active 与 selection 行为稳定。
    // - `std.event.active` 影响 selection/事件分发
    // - 初次挂载时没有明确 selection，paragraph placeholder 可能被误判成多行可见，且输入后不更新
    const focusEditorHost = () => {
      if (document.activeElement === host)
        return;
      try {
        host.focus({ preventScroll: true });
      }
      catch {
        host.focus();
      }
    };

    const ensureActiveAndSelection = () => {
      // 让 blocksuite 进入 active 状态（参考 focusBlockEnd 内部实现）
      std.event.active = true;

      // 如果当前没有文本光标，则将光标放到最后一个可编辑 paragraph；没有就追加一个
      if (currentModeRef.current === "edgeless") {
        // Edgeless 这边后续再补齐；目前这个问题集中在 page paragraph placeholder
        return;
      }

      const note = getLastNoteBlock(store);
      const lastBlock = note?.lastChild();
      if (lastBlock && lastBlock.flavour === "affine:paragraph") {
        const focusBlock = std.view.getBlock(lastBlock.id) ?? undefined;
        std.command.exec(focusBlockEnd, { focusBlock, force: true });
        return;
      }

      std.command.exec(appendParagraphCommand);
    };

    const rafId = requestAnimationFrame(() => {
      focusEditorHost();
      ensureActiveAndSelection();
    });

    // 修复：多行 placeholder 偶发残留
    // 原因：paragraph 内部会在 `updateComplete.then(...)` 里异步设置 placeholder visible，
    // 当 selection 很快切换（例如回车拆分段落）时可能发生竞态：旧段落晚到的 then 重新把 visible 打开。
    // playground 不容易触发，但在我们宿主/渲染节奏下会出现。
    // 这里在 selection/input 变化时做一次同步：只有当前 TextSelection 所在 block 的 placeholder 允许显示。
    const syncPlaceholdersToSelection = () => {
      const current = std.selection.find(TextSelection) as any;
      const focusedBlockId: string | undefined = current?.from?.blockId ?? current?.blockId;

      const placeholders = container.querySelectorAll<HTMLElement>(".affine-paragraph-placeholder.visible");
      for (const node of placeholders) {
        const blockEl = node.closest<HTMLElement>("[data-block-id]");
        const blockId = blockEl?.dataset.blockId;

        if (!focusedBlockId || !blockId || blockId !== focusedBlockId) {
          node.style.display = "none";
        }
        else {
          node.style.removeProperty("display");
        }
      }
    };

    const scheduleSync = () => {
      requestAnimationFrame(syncPlaceholdersToSelection);
    };

    const selectionSub = std.selection.slots.changed.subscribe(scheduleSync);
    host.addEventListener("input", scheduleSync, { capture: true });
    host.addEventListener("compositionend", scheduleSync, { capture: true });

    // 点击空白区域时：确保 active，并把光标落到可编辑段落
    const handlePointerDownCapture = (e: PointerEvent) => {
      focusEditorHost();
      // 如果点击已经发生在块内部（例如 rich-text 内部），不要强行重置 selection
      if (e.target instanceof HTMLElement && e.target.closest("rich-text, affine-paragraph")) {
        std.event.active = true;
        return;
      }
      ensureActiveAndSelection();
    };
    container.addEventListener("pointerdown", handlePointerDownCapture, { capture: true });

    return () => {
      mo.disconnect();
      portalMo.disconnect();
      cancelAnimationFrame(rafId);
      selectionSub.unsubscribe();
      host.removeEventListener("input", scheduleSync, { capture: true } as AddEventListenerOptions);
      host.removeEventListener("compositionend", scheduleSync, { capture: true } as AddEventListenerOptions);
      container.removeEventListener("pointerdown", handlePointerDownCapture, { capture: true } as AddEventListenerOptions);
      container.replaceChildren();

      if (typeof window !== "undefined" && import.meta.env.DEV) {
        const g = globalThis as any;
        if (g.host === host) delete g.host;
        if (g.std === std) delete g.std;
        if (g.blocksuiteStore === store) delete g.blocksuiteStore;
        if (g.TextSelection === TextSelection) delete g.TextSelection;
      }
    };
  }, [currentMode, docId, docModeProvider, spaceId]);

  return (
    <div className={className}>
      <div
        className={`rounded-box bg-base-100 border border-base-300 overflow-hidden${isFull ? " h-full flex flex-col" : ""}`}
      >
        <div
          ref={hostContainerRef}
          className={`${isFull ? "flex-1 min-h-0" : "min-h-32"} w-full ${currentMode === "edgeless" ? "affine-edgeless-viewport" : "affine-page-viewport"}`}
        />
      </div>
    </div>
  );
}
