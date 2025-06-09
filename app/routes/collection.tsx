import type { Route } from "./+types/home";
import CollectionPage from "@/components/common/collection/collectionPage";
import GitGraph from "@/components/create/gitGraph";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "tuan-chat" },
    { name: "description", content: "Welcome to tuan-chat!" },
  ];
}

export default function Collection() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <CollectionPage></CollectionPage>
      <GitGraph></GitGraph>
    </div>
  );
}
