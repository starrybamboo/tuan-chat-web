import { RoomContext } from "@/components/chat/roomContext";
import { EditableField } from "@/components/common/editableFiled";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import {
  useDissolveRoomMutation,
  useGetRoomInfoQuery,
  useUpdateRoomMutation,
} from "api/hooks/chatQueryHooks";
import { use } from "react";
import { useNavigate } from "react-router";

function RoomSettingWindow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const roomContext = use(RoomContext);
  // 获取群组数据
  const roomId = Number(roomContext.roomId);
  const getRoomInfoQuery = useGetRoomInfoQuery(roomId ?? -1);
  const room = getRoomInfoQuery.data?.data;
  // 解散群组
  const dissolveRoomMutation = useDissolveRoomMutation();
  const updateRoomMutation = useUpdateRoomMutation();

  return (
    <div className="w-full p-4 min-w-[40vw]">
      {room && (
        <div className="">
          <div className="flex justify-center">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                updateRoomMutation.mutate({ roomId, avatar: url });
              }}
              fileName={`roomId-${room.roomId}`}
            >
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={room.avatar}
                  alt={room.name}
                  className="w-24 h-24 mx-auto rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
                >
                  <span className="text-white font-medium px-2 py-1 rounded">
                    更新群头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>
          <EditableField
            content={room.name ?? ""}
            handleContentUpdate={name => updateRoomMutation.mutate({ roomId, name })}
            className="text-2xl font-bold text-center my-4"
          >
          </EditableField>
          <EditableField
            content={room.description ?? ""}
            handleContentUpdate={description => updateRoomMutation.mutate({ roomId, description })}
            className="text-gray-600 text-center"
          >
          </EditableField>
          <div className="flex justify-center mt-16">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => dissolveRoomMutation.mutate(roomId, {
                onSuccess: () => {
                  onClose();
                  navigate(`/chat/${roomContext.spaceId}`);
                },
              })}
            >
              解散房间
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomSettingWindow;
