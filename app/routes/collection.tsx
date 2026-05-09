import type { RouteMetaArgs } from "@/router/routeTypes";
import CollectionPage from "@/components/common/collection/collectionPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "收藏",
    description: "查看当前账号在团剧共创中的收藏内容。",
    path: "/collection",
    index: false,
  });
}

export default function Collection() {
  return (
    <div className="h-full bg-base-200 overflow-auto">
      <CollectionPage></CollectionPage>
    </div>
  );
}
