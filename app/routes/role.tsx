import type { Route } from "./+types/home";
import CharacterWrapper from "@/components/character/characterWrapper";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="max-h-[calc(100vh-3.5rem)]n h-[calc(100vh-3.5rem)]">
      <CharacterWrapper />
    </div>
  );
}
