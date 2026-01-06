import type { Route } from "./+types/blocksuitePlayground";

import { useEffect } from "react";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Blocksuite Playground - tuan-chat" },
    { name: "description", content: "Blocksuite playground（收编到 infra）" },
  ];
}

export default function BlocksuitePlaygroundPage() {
  useEffect(() => {
    let disposed = false;
    let stop: (() => void) | null = null;

    (async () => {
      const mod = await import(
        "@/components/chat/infra/blocksuite/playground/apps/starter/main"
      );
      stop = mod.stopStarterPlayground;
      await mod.startStarterPlayground();
    })().catch((err) => {
      if (!disposed) {
        console.error(err);
      }
    });

    return () => {
      disposed = true;
      stop?.();
    };
  }, []);

  return (
    <div
      className="h-full w-full overflow-hidden bg-[var(--affine-white-90)]"
    >
      <div id="app" className="h-full w-full">
        <div id="inspector" />
      </div>
    </div>
  );
}
