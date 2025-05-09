import type { Route } from "./+types/home";
import CollectionPage from "@/components/common/collection/collectionPage";
import GitGraph from "@/components/module/GitGraph";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to tuan-chat!" },
  ];
}

export default function Collection() {
  return (
    <div className="h-screen bg-base-200 overflow-auto">
      <CollectionPage></CollectionPage>
      <GitGraph></GitGraph>
    </div>
  );
}
