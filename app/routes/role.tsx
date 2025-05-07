import type { Route } from "./+types/home";
import CharacterMain from "@/components/newCharacter/CharacterMain";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "角色创建页面" },
    { name: "description", content: "创建和管理你的角色" },
  ];
}

export default function Role() {
  return (
    <CharacterMain />
  );
}
