import RoomButton from "@/components/chat/smallComponents/roomButton";
import SpaceButton from "@/components/chat/smallComponents/spaceButton";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  useGetUserRoomsQueries,
  useGetUserSpacesQuery,
} from "../../../../api/hooks/chatQueryHooks";

/**
 * 转发窗口组件
 * @param onClickRoom - 点击房间按钮时的回调函数
 * @param generateForwardMessage - 生成转发消息并返回消息ID的函数
 */
function ForwardWindow({ onClickRoom, generateForwardMessage }:
{
  onClickRoom: (roomId: number) => void;
  generateForwardMessage: () => Promise<number | null>;
}) {
  const navigate = useNavigate();

  // 获取空间和房间数据
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  const userRoomsQueries = useGetUserRoomsQueries(spaces);

  // 状态：当前选中的空间ID
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);
  // 状态：是否正在生成转发消息
  const [isGeneratingForward, setIsGeneratingForward] = useState(false);

  // 使用 useMemo 优化计算，将房间数据按 spaceId 组织
  const spaceIdToRooms = useMemo(() => {
    const result: Record<number, any[]> = {};
    for (const space of spaces) {
      const spaceId = space.spaceId ?? -1;
      // 找到对应空间的房间查询结果
      result[spaceId] = userRoomsQueries.find(query =>
        query.data?.data?.some(room => room.spaceId === space.spaceId),
      )?.data?.data ?? [];
    }
    return result;
  }, [spaces, userRoomsQueries]);

  // 获取当前选中空间的房间列表
  const currentRooms = selectedSpaceId ? spaceIdToRooms[selectedSpaceId] ?? [] : [];

  /**
   * 处理“分享到社区”按钮点击事件
   */
  const handleShareToCommunity = async () => {
    setIsGeneratingForward(true);
    try {
      const messageId = await generateForwardMessage();
      if (messageId) {
        // 如果成功生成消息，则携带消息ID跳转到社区发帖页面
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
      toast.error("生成转发消息时出错");
    }
    finally {
      setIsGeneratingForward(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* 分享到社区按钮 */}
      <button
        className="btn btn-primary self-center"
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

      <div className="divider text-sm">或者选择转发到群组</div>

      {/* 空间和房间选择区域 */}
      <div className="flex flex-row bg-base-100 border border-base-300 rounded-lg h-80 md:h-96">
        {/* 空间列表 */}
        <div className="flex flex-col p-2 gap-2 bg-base-300/40 flex-shrink-0 overflow-y-auto relative">
          {spaces.map(space => (
            <SpaceButton
              key={space.spaceId}
              space={space}
              unreadMessageNumber={0}
              onclick={() => setSelectedSpaceId(space.spaceId ?? -1)}
              isActive={selectedSpaceId === space.spaceId}
            />
          ))}
        </div>

        <div className="w-px bg-base-300 flex-shrink-0"></div>

        {/* 房间列表 */}
        <div className="flex flex-col py-2 flex-1 min-w-0 w-48 md:w-56 overflow-hidden">
          <div className="flex flex-col gap-2 h-full overflow-auto px-1">
            {selectedSpaceId
              ? (
                  <>
                    <div className="text-center font-bold text-sm mb-2 px-2 py-1 bg-base-200/50 rounded mx-1 flex-shrink-0">
                      {spaces.find(s => s.spaceId === selectedSpaceId)?.name}
                    </div>
                    {currentRooms.map(room => (
                      <div key={room.roomId} className="px-1 flex-shrink-0">
                        <RoomButton
                          room={room}
                          unreadMessageNumber={0}
                          onclick={() => onClickRoom(room.roomId ?? -1)}
                          isActive={false}
                        />
                      </div>
                    ))}
                    {currentRooms.length === 0 && (
                      <div className="flex items-center justify-center flex-1 text-base-content/50 text-sm">
                        该空间暂无房间
                      </div>
                    )}
                  </>
                )
              : (
                  <div className="flex items-center justify-center h-full text-base-content/50 text-sm">
                    <div className="text-center">
                      <div className="text-4xl mb-2">👈</div>
                      <div>请选择左侧空间</div>
                    </div>
                  </div>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForwardWindow;
