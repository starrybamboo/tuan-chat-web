import type { Route } from "./+types/home";

import { UserDetail } from "@/view/common/userDetail";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="h-screen">
      <UserDetail userId={10001}></UserDetail>
    </div>
  );
}
