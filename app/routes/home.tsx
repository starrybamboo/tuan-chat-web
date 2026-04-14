import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "进入团剧共创",
    description: "团剧共创首页会根据当前登录状态跳转到对应的工作区。",
    path: "/",
    index: false,
  });
}

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/chat/private", { replace: true });
  }, [navigate]);

  return null;
}
