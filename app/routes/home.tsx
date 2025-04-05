import CharacterWrapper from "@/view/characterWrapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function meta() {
  return [
    { title: "角色管理" },
    { name: "description", content: "角色管理" },
  ];
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <CharacterWrapper></CharacterWrapper>
    </QueryClientProvider>
  );
}
