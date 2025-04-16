import type { Route } from "./+types/home";
import CharacterMain from "@/components/newCharacter/CharacterMain";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Role() {
  return (
    <div className="h-screen">
      <CharacterMain />
    </div>
  );
}
