import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Settings() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      settings
    </div>
  );
}
