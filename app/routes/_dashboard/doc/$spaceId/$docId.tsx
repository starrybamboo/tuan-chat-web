import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "文档",
    description: "团剧共创文档入口页。",
    path: "/doc",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/doc/$spaceId/$docId")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: DocRoute,
});

function DocRoute() {
  const { spaceId, docId } = useParams({ strict: false });
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
  return (
    <Navigate
      to="/chat/$spaceId/doc/$docId"
      params={{
        spaceId: String(sid),
        docId: encodeURIComponent(decoded),
      }}
      replace
    />
  );
}
