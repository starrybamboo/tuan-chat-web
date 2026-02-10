import { useMemo } from "react";
import { useParams } from "react-router";

import DNDMap from "@/components/chat/shared/map/DNDMap";

export default function RoomMapFrameRoute() {
  const params = useParams();
  const roomId = useMemo(() => Number(params.roomId), [params.roomId]);
  const spaceId = useMemo(() => Number(params.spaceId), [params.spaceId]);

  if (!Number.isFinite(roomId) || roomId <= 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-200">
        <span className="text-sm text-base-content/60">无效的房间ID</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-base-200">
      <DNDMap roomId={roomId} spaceId={spaceId} variant="frame" />
    </div>
  );
}
