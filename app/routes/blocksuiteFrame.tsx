import type { RouteMetaArgs } from "@/router/routeTypes";
import { BlocksuiteRouteFrameClient } from "@/components/chat/infra/blocksuite/BlocksuiteRouteFrameClient";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "文档框架",
    description: "团剧共创内部使用的文档隔离框架页面。",
    path: "/blocksuite-frame",
    index: false,
  });
}

export default function BlocksuiteFrameRoute() {
  return <BlocksuiteRouteFrameClient />;
}
