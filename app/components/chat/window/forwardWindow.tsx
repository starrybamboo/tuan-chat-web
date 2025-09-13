import RoomButton from "@/components/chat/smallComponents/roomButton";
import SpaceButton from "@/components/chat/smallComponents/spaceButton";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetUserRoomsQueries,
  useGetUserSpacesQuery,
} from "../../../../api/hooks/chatQueryHooks";

function ForwardWindow({ onClickRoom, handlePublishFeed }:
{ onClickRoom: (roomId: number) => void
;handlePublishFeed: ({ title, description }: { title: string; description: string }) => Promise<boolean>; }) {
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  const userRoomsQueries = useGetUserRoomsQueries(spaces);

  // 选中的空间ID
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null);

  // 空间对应的房间列表
  const spaceIdToRooms = useMemo(() => {
    const result: Record<number, any[]> = {};
    for (const space of spaces) {
      const spaceId = space.spaceId ?? -1;
      result[spaceId] = userRoomsQueries.find(query =>
        query.data?.data?.some(room => room.spaceId === space.spaceId),
      )?.data?.data ?? [];
    }
    return result;
  }, [spaces, userRoomsQueries]);

  // 当前选中空间的房间列表
  const currentRooms = selectedSpaceId ? spaceIdToRooms[selectedSpaceId] ?? [] : [];

  const [isOpenPublishFeedWindow, setIsOpenPublishFeedWindow] = useSearchParamsState<boolean>(`forwardPop`, false);
  const [feedData, setFeedData] = useState({
    title: "",
    description: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  const [isPublish, setIsPublish] = useState(false);
  const handleSubmit = async () => {
    setIsPublish(true);
    try {
      const success = await handlePublishFeed(feedData);
      if (success)
        toast.success("分享成功");
      else
        toast.error("分享失败");
    }
    finally {
      setIsPublish(false);
      setIsOpenPublishFeedWindow(false);
      setFeedData({ title: "", description: "" });
    }
  };
  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      <button className="btn btn-primary self-center" type="button" onClick={() => setIsOpenPublishFeedWindow(true)}>
        分享到社区
      </button>

      <div className="divider text-sm">或者选择转发到群组</div>

      <div className="flex flex-row bg-base-100 border border-base-300 rounded-lg overflow-hidden h-80 md:h-96">
        {/* 空间列表 */}
        <div className="flex flex-col p-2 gap-2 bg-base-300/40 w-16 md:w-20 flex-shrink-0">
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
        <div className="flex flex-col py-2 flex-1 min-w-0 overflow-hidden w-48 md:w-56">
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
      <PopWindow isOpen={isOpenPublishFeedWindow} onClose={() => setIsOpenPublishFeedWindow(false)}>
        <div className="p-4 w-full max-w-md">
          <h3 className="text-lg font-bold mb-4">分享到社区</h3>
          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">标题</span>
            </label>
            <input
              type="text"
              name="title"
              value={feedData.title}
              onChange={handleInputChange}
              placeholder="输入标题"
              className="input input-bordered w-full"
            />
          </div>
          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text">描述</span>
            </label>
            <textarea
              name="description"
              value={feedData.description}
              onChange={handleInputChange}
              placeholder="输入描述"
              className="textarea textarea-bordered w-full h-32"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => setIsOpenPublishFeedWindow(false)}
              type="button"
            >
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!feedData.title || isPublish}
              type="button"
            >
              确认分享
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}

export default ForwardWindow;
