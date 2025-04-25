import React from "react";
import { useGetUserRoomsQuery } from "../../../../api/queryHooks";

function ForwardWindow({ onClickRoom, handlePublishFeed }:
{ onClickRoom: (roomId: number) => void
;handlePublishFeed: () => void; }) {
  const userRoomsQuery = useGetUserRoomsQuery();
  const rooms = userRoomsQuery.data?.data ?? [];
  return (
    <div className="gap-2 flex flex-col items-center overflow-auto">
      选择要转发的群组：
      {
        rooms.map(room => (
          <button
            key={room.roomId}
            className="btn btn-ghost flex justify-start w-full gap-2"
            type="button"
            onClick={() => onClickRoom(room.roomId ?? -1)}
          >
            <div className="avatar mask mask-squircle w-8">
              <img
                src={room.avatar}
                alt={room.name}
              />
            </div>
            <span>{room.name}</span>
          </button>
        ))
      }
      <button className="btn" type="button" onClick={() => handlePublishFeed()}>
        分享到社区
      </button>
    </div>
  );
}

export default ForwardWindow;
