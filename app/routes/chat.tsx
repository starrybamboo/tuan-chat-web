import type { Route } from "./+types/home";

import GroupSelect from "@/components/chat/groupSelect";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Chat() {
  return (
    <div className="h-screen bg-base-200 flex">
      <GroupSelect />
    </div>
  );
}
