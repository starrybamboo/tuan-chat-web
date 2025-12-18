import type { Route } from "./+types/home";
import { redirect } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  return redirect("/chat");
}

export default function Home() {
  return null;
}
