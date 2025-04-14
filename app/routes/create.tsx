import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Create() {
  return (
    <div className="h-screen">
      <p>create</p>
    </div>
  );
}
