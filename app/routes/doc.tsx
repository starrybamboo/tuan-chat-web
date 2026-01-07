import type { Route } from "./+types/doc";

import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { useParams } from "react-router";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Doc - tuan-chat" },
    { name: "description", content: "Doc view" },
  ];
}

export default function DocRoute() {
  const { spaceId, docId } = useParams();
  const sid = Number(spaceId);
  if (!Number.isFinite(sid) || !docId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>Invalid doc params</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <BlocksuiteDescriptionEditor
        workspaceId={`space:${sid}`}
        spaceId={sid}
        docId={decodeURIComponent(docId)}
        variant="full"
        allowModeSwitch
        fullscreenEdgeless
      />
    </div>
  );
}
