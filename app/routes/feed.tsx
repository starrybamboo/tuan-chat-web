import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Feed() {
  return (
    <div className="h-screen">
      <p>feed</p>
    </div>
  );
}
