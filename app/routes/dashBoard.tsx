import type { Route } from "./+types/dashBoard";
import { Outlet } from "react-router";
import Topbar from "@/components/topbanner/Topbanner";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
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
