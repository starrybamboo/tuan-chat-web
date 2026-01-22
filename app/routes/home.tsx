import type { Route } from "./+types/home";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/chat/private", { replace: true });
  }, [navigate]);

  return null;
}
