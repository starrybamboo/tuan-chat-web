import type { Route } from "./+types/home";
import Topbar from "@/components/topbanner/Topbanner";
import { Outlet } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function DashBoard() {
  return (
    <div className="h-screen w-screen flex flex-col ">
      <Topbar></Topbar>
      <Outlet></Outlet>
    </div>
  );
}
