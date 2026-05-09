import type { RouteMetaArgs } from "@/routes/routeTypes";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "团剧共创展示页",
    description: "使用 Motion 实现的团剧共创沉浸式展示页。",
    path: "/scroll-sequence-motion-demo",
    index: false,
  });
}

export const Route = createFileRoute("/scroll-sequence-motion-demo")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: ScrollSequenceMotionDemoPage,
});

function ScrollSequenceMotionDemoPage() {
  return <Navigate to="/scroll-sequence-demo" replace />;
}
