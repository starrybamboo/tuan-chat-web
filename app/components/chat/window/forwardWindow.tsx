import React, { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  useGetUserRoomsQueries,
  useGetUserSpacesQuery,
} from "../../../../api/hooks/chatQueryHooks";

function ForwardWindow({ onClickRoom, generateForwardMessage }:
{ onClickRoom: (roomId: number) => void; generateForwardMessage: () => Promise<number | null> }) {
  const navigate = useNavigate();
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  const userRoomsQueries = useGetUserRoomsQueries(spaces);
  const rooms = userRoomsQueries.map(query => query.data?.data ?? []).flat();

  const [isGeneratingForward, setIsGeneratingForward] = useState(false);

  const handleShareToCommunity = async () => {
    setIsGeneratingForward(true);
    try {
      // 先生成转发消息
      const messageId = await generateForwardMessage();
      if (messageId) {
        // 跳转到创建帖子页面，带上消息ID
        const searchParams = new URLSearchParams();
        searchParams.set("messageId", messageId.toString());
        navigate(`/community/create?${searchParams.toString()}`);
      }
      else {
        toast.error("生成转发消息失败");
      }
    }
    catch (error) {
      console.error("生成转发消息时出错:", error);
      toast.error("生成转发消息失败");
    }
    finally {
      setIsGeneratingForward(false);
    }
  };

  return (
    <div className="gap-2 flex flex-col items-center overflow-auto">
      <button
        className="btn"
        type="button"
        onClick={handleShareToCommunity}
        disabled={isGeneratingForward}
      >
        {isGeneratingForward
          ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                生成中...
              </>
            )
          : (
              "分享到社区"
            )}
      </button>
      或者选择转发到群组：
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
    </div>
  );
}

export default ForwardWindow;
