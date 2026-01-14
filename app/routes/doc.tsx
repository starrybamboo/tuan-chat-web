import type { Route } from "./+types/doc";

import { Navigate, useParams } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Doc - tuan-chat" },
    { name: "description", content: "Doc view" },
  ];
}

export default function DocRoute() {
  const { spaceId, docId } = useParams();
  const sid = Number(spaceId);
  const rawDocId = typeof docId === "string" ? docId : "";

  if (!Number.isFinite(sid) || !rawDocId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>Invalid doc params</span>
      </div>
    );
  }

  let decoded = rawDocId;
  try {
    decoded = decodeURIComponent(rawDocId);
  }
  catch {
    // ignore
  }

  // 统一文档入口到 Chat 布局：保留左侧侧边栏，只替换主区域内容。
  return <Navigate to={`/chat/${sid}/doc/${encodeURIComponent(decoded)}`} replace />;
}
