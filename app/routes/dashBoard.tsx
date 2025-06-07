import type { Route } from "./+types/home";
import Topbar from "@/components/topbanner/Topbanner";
import React from "react";
import { Outlet } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function DashBoard() {
  return (
    <div className="h-screen w-screen flex flex-col">
      <Topbar></Topbar>
      <div className="flex-1 overflow-auto">
        <Outlet></Outlet>
      </div>
    </div>
  );
}
