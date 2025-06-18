import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";
import {
  useGetUserRoomsQueries,
  useGetUserSpacesQuery,
} from "../../../../api/hooks/chatQueryHooks";

function ForwardWindow({ onClickRoom, handlePublishFeed }:
{ onClickRoom: (roomId: number) => void
;handlePublishFeed: ({ title, description }: { title: string; description: string }) => void; }) {
  const userSpacesQuery = useGetUserSpacesQuery();
  const spaces = userSpacesQuery.data?.data ?? [];
  const userRoomsQueries = useGetUserRoomsQueries(spaces);
  const rooms = userRoomsQueries.map(query => query.data?.data ?? []).flat();
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
  const handleSubmit = () => {
    handlePublishFeed(feedData);
    setIsOpenPublishFeedWindow(false);
    setFeedData({ title: "", description: "" });
  };
  return (
    <div className="gap-2 flex flex-col items-center overflow-auto">
      <button className="btn" type="button" onClick={() => setIsOpenPublishFeedWindow(true)}>
        分享到社区
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
            >
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!feedData.title}
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
