import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Create() {
  return (
    <div className="h-screen bg-base-200 overflow-auto">
      <p>create</p>
    </div>
  );
}
