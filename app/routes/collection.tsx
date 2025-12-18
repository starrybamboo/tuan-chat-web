import type { Route } from "./+types/collection";
import CollectionPage from "@/components/common/collection/collectionPage";

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
    </div>
  );
}
