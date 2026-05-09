import type { RouteMetaArgs } from "@/router/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@/router/reactRouterCompat";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "进入团剧共创",
    description: "团剧共创首页会根据当前登录状态跳转到对应的工作区。",
    path: "/",
    index: false,
  });
}

export const Route = createFileRoute("/_dashboard/")({
  head: () => ({
    meta: meta({ params: {} }),
  }),
  component: Home,
});

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/chat/discover/material", { replace: true });
  }, [navigate]);

  return null;
}
