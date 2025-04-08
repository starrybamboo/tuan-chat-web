import type { Route } from "./+types/home";

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
      <Chat />
    </div>
  );
}
