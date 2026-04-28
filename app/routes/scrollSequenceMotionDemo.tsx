import type { Route } from "./+types/scrollSequenceMotionDemo";

import { Navigate } from "react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "团剧共创展示页",
    description: "使用 Motion 实现的团剧共创沉浸式展示页。",
    path: "/scroll-sequence-motion-demo",
    index: false,
  });
}

export default function ScrollSequenceMotionDemoPage() {
  return <Navigate to="/scroll-sequence-demo" replace />;
}
