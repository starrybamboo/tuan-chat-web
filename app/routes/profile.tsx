import type { Route } from "./+types/home";

import { UserDetail } from "@/components/common/userDetail";
import { useGlobalContext } from "@/components/globalContextProvider";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Profile() {
  const userId = useGlobalContext().userId;
  return (
    <div className="h-screen">
      <UserDetail userId={userId}></UserDetail>
    </div>
  );
}
