import type { Route } from "./+types/home";
import { Navigate } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Navigate to="/chat" replace />;
}
