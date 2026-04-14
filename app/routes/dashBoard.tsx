import type { Route } from "./+types/dashBoard";
import { Outlet } from "react-router";
import Topbar from "@/components/topbanner/Topbanner";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: Route.MetaArgs) {
  return createSeoMeta({
    title: "团剧共创工作台",
    description: "团剧共创主应用工作台。",
    path: "/",
    index: false,
  });
}

export default function DashBoard() {
  return (
    <div className="h-dvh w-full min-w-0 grid grid-rows-[auto_1fr]">
      <Topbar></Topbar>
      <div className="min-h-0 min-w-0 overflow-y-auto">
        <Outlet></Outlet>
      </div>
    </div>
  );
}
