import type { Route } from "./+types/blocksuiteFrame";
import { BlocksuiteRouteFrameClient } from "@/components/chat/infra/blocksuite/frame/BlocksuiteRouteFrameClient";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Blocksuite Frame - tuan-chat" },
    { name: "description", content: "Blocksuite isolated frame" },
  ];
}

export default function BlocksuiteFrameRoute() {
  return <BlocksuiteRouteFrameClient />;
}
