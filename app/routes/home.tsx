import type { Route } from "./+types/home";
import HomePage from "@/components/home/homePage";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <HomePage></HomePage>
    </div>
  );
}
