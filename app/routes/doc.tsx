import type { Route } from "./+types/doc";

import { Navigate, useParams } from "react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "文档",
    description: "团剧共创文档入口页。",
    path: "/doc",
    index: false,
  });
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
