import type { Route } from "./+types/home";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// import { Welcome } from "../welcome/welcome";

import DialogueWindow from "../view/dialogueWindow";

const queryClient = new QueryClient();

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-base-200">
        {/* 骨架结构, 纯为了测试 */}
        <div className="flex h-screen">
          {/* 侧边栏骨架 */}
          <aside className="w-64 bg-base-100 border-r p-4 animate-pulse">
          </aside>
          <DialogueWindow />
          <aside className="w-64 bg-base-100 border-r p-4 animate-pulse">
          </aside>
        </div>
      </div>
    </QueryClientProvider>
  );
}
