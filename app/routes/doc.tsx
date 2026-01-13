import type { Route } from "./+types/doc";

import { useGetSpaceMembersQuery } from "api/hooks/chatQueryHooks";
import { useParams } from "react-router";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { useGlobalContext } from "@/components/globalContextProvider";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Doc - tuan-chat" },
    { name: "description", content: "Doc view" },
  ];
}

export default function DocRoute() {
  const { spaceId, docId } = useParams();
  const sid = Number(spaceId);
  const globalContext = useGlobalContext();
  const userId = globalContext.userId;

  const spaceMembersQuery = useGetSpaceMembersQuery(sid);
  const isKP = Boolean(spaceMembersQuery.data?.data?.some(m => m.userId === userId && m.memberType === 1));

  if (!Number.isFinite(sid) || !docId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>Invalid doc params</span>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>请先登录</span>
      </div>
    );
  }

  if (spaceMembersQuery.isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>加载中...</span>
      </div>
    );
  }

  if (!isKP) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <span>仅KP可查看文档</span>
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
