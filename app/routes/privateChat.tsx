import type { Route } from "./+types/home";
import PrivateChatPage from "../components/privateChat/privateChatPage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "私聊 - 团剧共创" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function PrivateChat() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <PrivateChatPage />
    </div>
  );
}
