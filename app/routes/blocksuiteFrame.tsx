import type { Route } from "./+types/blocksuiteFrame";
import { lazy, Suspense } from "react";

const BlocksuiteRouteFrameClient = lazy(async () => {
  const mod = await import("@/components/chat/infra/blocksuite/frame/BlocksuiteStandaloneFrameApp");
  return { default: mod.BlocksuiteStandaloneFrameApp };
});

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Blocksuite Frame - tuan-chat" },
    { name: "description", content: "Blocksuite isolated frame" },
  ];
}

function BlocksuiteFrameFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <span className="text-sm opacity-70">Loading Blocksuite runtime...</span>
    </div>
  );
}

export default function BlocksuiteFrameRoute() {
  return (
    <Suspense fallback={<BlocksuiteFrameFallback />}>
      <BlocksuiteRouteFrameClient />
    </Suspense>
  );
}
