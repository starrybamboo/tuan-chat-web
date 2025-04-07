import type { Route } from "./+types/home";

import Topbar from "@/components/topbanner/Topbanner";
import Chat from "@/view/chat/chat";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="h-screen">
      <Topbar></Topbar>
      <Chat />
    </div>
  );
}
