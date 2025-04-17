import type { Route } from "./+types/home";
import CharacterWrapper from "@/components/character/characterWrapper";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Role() {
  return (
    <div className="h-screen">
      <CharacterWrapper />
    </div>
  );
}
