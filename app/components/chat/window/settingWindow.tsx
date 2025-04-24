import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useDissolveRoomMutation, useGetRoomInfoQuery, useUpdateRoomAvatar } from "../../../../api/queryHooks";

function SettingWindow({ roomId, onClose }: { roomId: number; onClose: () => void }) {
  // 获取群组数据
  const getRoomInfoQuery = useGetRoomInfoQuery(roomId);
  const room = getRoomInfoQuery.data?.data;
  // 解散群组
  const dissolveRoomMutation = useDissolveRoomMutation();
  // 更新群头像
  const updateRoomAvatar = useUpdateRoomAvatar();

  return (
    <div className="w-full p-4">
      {room && (
        <div>
          <div className="flex justify-center">
            <ImgUploader setImg={newImg => updateRoomAvatar.mutate({ roomId, avatar: URL.createObjectURL(newImg) })}>
              <img
                src={room.avatar}
                alt={room.name}
                className="w-24 h-24 mx-auto rounded-lg"
              />
            </ImgUploader>
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
