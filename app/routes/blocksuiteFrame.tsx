import type { RouteMetaArgs } from "@/router/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "文档",
    description: "团剧共创文档页面。",
    path: "/blocksuite-frame",
    index: false,
  });
}

export const Route = createFileRoute("/blocksuite-frame")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: BlocksuiteFrameRoute,
});

export default function BlocksuiteFrameRoute() {
  return <div className="min-h-screen bg-base-200" aria-hidden="true" />;
}
