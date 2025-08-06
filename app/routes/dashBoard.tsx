import type { Route } from "./+types/home";
import Topbar from "@/components/topbanner/Topbanner";
import { Outlet } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function DashBoard() {
  return (
    <div className="h-dvh w-screen flex flex-col overflow-auto">
      <Topbar></Topbar>
      <Outlet></Outlet>
    </div>
  );
}
