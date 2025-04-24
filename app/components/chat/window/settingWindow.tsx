import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import {
  useDissolveRoomMutation,
  useGetRoomInfoQuery,
  useUpdateRoom,
} from "../../../../api/queryHooks";

function SettingWindow({ roomId, onClose }: { roomId: number; onClose: () => void }) {
  // 获取群组数据
  const getRoomInfoQuery = useGetRoomInfoQuery(roomId);
  const room = getRoomInfoQuery.data?.data;
  // 解散群组
  const dissolveRoomMutation = useDissolveRoomMutation();
  // 更新群头像
  const updateRoomAvatar = useUpdateRoom();

  return (
    <div className="w-full p-4">
      {room && (
        <div className="w-[50vw]">
          <div className="flex justify-center">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                updateRoomAvatar.mutate({ roomId, avatar: url });
              }}
              fileName="roomId"
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
          <h2 className="text-2xl font-bold text-center my-4">{room.name}</h2>
          <p className="text-gray-600 text-center">{room.description}</p>
          <div className="flex justify-end mt-16">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => dissolveRoomMutation.mutate({ roomId }, {
                onSuccess: () => {
                  onClose();
                },
              })}
            >
              解散群组
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingWindow;
