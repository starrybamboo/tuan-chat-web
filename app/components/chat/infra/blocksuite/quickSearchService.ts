type MinimalDocMeta = { id: string; title?: string };

type MinimalWorkspaceMeta = {
  docMetas?: MinimalDocMeta[];
};

type SearchDocParams = {
  action: "insert" | string;
  userInput?: string;
  skipSelection?: boolean;
};

type SearchDocResult
  = | { docId: string; isNewDoc: boolean }
    | { userInput: string };

export type BlocksuiteQuickSearchService = {
  searchDoc: (params: SearchDocParams) => Promise<SearchDocResult | null>;
  dispose: () => void;
  /** internal marker */
  __tuanchatQuickSearchService?: true;
};

function isProbablyUrl(input: string) {
  const s = input.trim();
  return /^https?:\/\//i.test(s);
}

function normalizeQuery(input: string) {
  return input.trim().toLowerCase();
}

export function getDocTitleFromMeta(meta: MinimalWorkspaceMeta | null | undefined, docId: string): string {
  const id = String(docId ?? "").trim();
  if (!id)
    return "";
  const metas = meta?.docMetas ?? [];
  const hit = metas.find(m => m?.id === id);
  return (hit?.title ?? "").trim();
}

export function createBlocksuiteQuickSearchService(params: {
  meta: MinimalWorkspaceMeta;
}): BlocksuiteQuickSearchService {
  const { meta } = params;

  let activeCleanup: (() => void) | null = null;

  const dispose = () => {
    activeCleanup?.();
    activeCleanup = null;
  };

  const getDocMetas = (): MinimalDocMeta[] => {
    try {
      return meta.docMetas ?? [];
    }
    catch {
      return [];
    }
  };

  const searchDoc: BlocksuiteQuickSearchService["searchDoc"] = async ({ userInput }) => {
    // Close previous picker if any
    dispose();

    return await new Promise<SearchDocResult | null>((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.background = "transparent";

      const panel = document.createElement("div");
      panel.style.position = "fixed";
      panel.style.left = "50%";
      panel.style.top = "50%";
      panel.style.transform = "translate(-50%, -50%)";
      panel.style.minWidth = "min(520px, calc(100vw - 24px))";
      panel.style.maxWidth = "min(720px, calc(100vw - 24px))";
      panel.style.maxHeight = "min(70vh, 520px)";
      panel.style.overflow = "hidden";

      // Reuse existing app theme styles as much as possible.
      // No hard-coded colors/shadows; rely on base background + border classes.
      panel.className = "bg-base-100 border border-base-300 rounded-box";

      const header = document.createElement("div");
      header.className = "p-3 border-b border-base-300";

      const input = document.createElement("input");
      input.className = "input input-bordered w-full";
      input.type = "text";
      input.placeholder = "搜索文档标题，或粘贴 http(s) 链接";
      input.value = userInput ?? "";

      header.appendChild(input);

      const list = document.createElement("div");
      list.className = "max-h-[50vh] overflow-auto";

      const empty = document.createElement("div");
      empty.className = "p-3 text-sm opacity-70";
      empty.textContent = "没有匹配的文档";

      panel.appendChild(header);
      panel.appendChild(list);

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      let selectedIndex = 0;

      function cleanup() {
        overlay.removeEventListener("click", onOverlayClick, true);
        window.removeEventListener("keydown", onKeyDown, true);
        input.removeEventListener("input", onInput);
        overlay.remove();

        if (activeCleanup === cleanup)
          activeCleanup = null;
      }

      const close = (result: SearchDocResult | null) => {
        cleanup();
        resolve(result);
      };

      const render = () => {
        list.innerHTML = "";

        const query = normalizeQuery(input.value);

        const docs = getDocMetas()
          .filter((m) => {
            if (!m?.id)
              return false;
            if (!query)
              return true;
            return (m.title ?? "").toLowerCase().includes(query);
          })
          .slice(0, 50);

        const items: Array<
          | { kind: "doc"; id: string; title: string }
          | { kind: "url"; url: string }
        > = [];

        const raw = input.value.trim();
        if (isProbablyUrl(raw)) {
          items.push({ kind: "url", url: raw });
        }
        for (const d of docs) {
          items.push({ kind: "doc", id: d.id, title: d.title ?? d.id });
        }

        if (items.length === 0) {
          list.appendChild(empty);
          selectedIndex = 0;
          return;
        }

        if (selectedIndex < 0)
          selectedIndex = 0;
        if (selectedIndex >= items.length)
          selectedIndex = items.length - 1;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          const row = document.createElement("button");
          row.type = "button";
          row.className = `w-full text-left px-3 py-2 hover:bg-base-200 flex items-center gap-2${i === selectedIndex ? " bg-base-200" : ""}`;

          const main = document.createElement("div");
          main.className = "flex-1 min-w-0";

          const title = document.createElement("div");
          title.className = "truncate";

          const sub = document.createElement("div");
          sub.className = "text-xs opacity-60 truncate";

          if (item.kind === "url") {
            title.textContent = `插入链接：${item.url}`;
            sub.textContent = item.url;
          }
          else {
            title.textContent = item.title;
            sub.textContent = item.id;
          }

          main.appendChild(title);
          main.appendChild(sub);

          row.appendChild(main);

          row.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (item.kind === "url") {
              close({ userInput: item.url });
            }
            else {
              close({ docId: item.id, isNewDoc: false });
            }
          });

          list.appendChild(row);
        }
      };

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
          e.preventDefault();
          close(null);
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedIndex += 1;
          render();
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedIndex -= 1;
          render();
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();

          const query = normalizeQuery(input.value);
          const raw = input.value.trim();

          if (isProbablyUrl(raw) && selectedIndex === 0) {
            close({ userInput: raw });
            return;
          }

          const metas = getDocMetas().filter((m) => {
            if (!query)
              return true;
            return (m.title ?? "").toLowerCase().includes(query);
          });

          const offset = isProbablyUrl(raw) ? 1 : 0;
          const picked = metas[selectedIndex - offset];
          if (picked?.id) {
            close({ docId: picked.id, isNewDoc: false });
            return;
          }

          close(null);
        }
      }

      function onOverlayClick(e: MouseEvent) {
        if (e.target === overlay) {
          e.preventDefault();
          close(null);
        }
      }

      function onInput() {
        selectedIndex = 0;
        render();
      }

      activeCleanup = cleanup;

      overlay.addEventListener("click", onOverlayClick, true);
      window.addEventListener("keydown", onKeyDown, true);
      input.addEventListener("input", onInput);

      render();

      // Ensure focus after mounting
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  };

  return { searchDoc, dispose, __tuanchatQuickSearchService: true };
}
