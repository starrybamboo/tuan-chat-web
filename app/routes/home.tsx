import type { Route } from "./+types/home";

// import { Welcome } from "../welcome/welcome";

import Topbar from "@/components/topbanner/Topbanner";
import Chat from "@/view/chat/chat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <div className="h-screen">
      <QueryClientProvider client={queryClient}>
        <Topbar></Topbar>
        <Chat />
      </QueryClientProvider>
    </div>

  );
}
