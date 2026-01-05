import type { Route } from "./+types/docTest";

import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";

import { useMemo, useState } from "react";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "文档测试 - tuan-chat" },
    { name: "description", content: "Blocksuite 本地持久化文档测试页" },
  ];
}

export default function DocTestPage() {
  // 固定一个 space，用于本地持久化测试（IndexedDB）。
  // 说明：spaceId/docId 组合决定本地存储 key。
  const spaceId = 0;

  const [docIdInput, setDocIdInput] = useState("doc:test");
  const docId = useMemo(() => docIdInput.trim() || "doc:test", [docIdInput]);

  const [mode, setMode] = useState<"page" | "edgeless">("page");

  return (
    <div className="h-full w-full p-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <div className="text-sm opacity-70 select-none">
          文档测试（本地 IndexedDB 持久化）
          <span className="ml-2 opacity-70">
            spaceId=
            {spaceId}
          </span>
          <span className="ml-2 opacity-70">
            docId=
            {docId}
          </span>
          <span className="ml-2 opacity-70">
            mode=
            {mode}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-sm opacity-70 select-none">docId</span>
            <input
              className="input input-bordered input-sm w-72"
              value={docIdInput}
              onChange={e => setDocIdInput(e.target.value)}
              placeholder="doc:test"
            />
          </label>

          <div className="join">
            <button
              type="button"
              className={`btn btn-sm join-item ${mode === "page" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setMode("page")}
            >
              Page
            </button>
            <button
              type="button"
              className={`btn btn-sm join-item ${mode === "edgeless" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setMode("edgeless")}
            >
              Edgeless
            </button>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setMode(m => (m === "page" ? "edgeless" : "page"))}
          >
            切换模式
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <BlocksuiteDescriptionEditor
          spaceId={spaceId}
          docId={docId}
          mode={mode}
          variant="full"
          className="h-full"
        />
      </div>
    </div>
  );
}
