import type { Route } from "./+types/home";

import RoomSelect from "@/components/chat/roomSelect";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Chat() {
  return (
    <div className="bg-base-200 overflow-y-auto">
      <RoomSelect />
    </div>
  );
}
