import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Community() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <p>community</p>
    </div>
  );
}
