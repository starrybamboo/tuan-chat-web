import { useCreateRoomMutation, useGetSpaceInfoQuery } from "api/hooks/chatQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useEffect, useId, useState } from "react";
import checkBack from "@/components/common/autoContrastText";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { PlusIcon } from "@/icons";
import { imageLowUrl } from "@/utils/mediaUrl";

interface CreateRoomWindowProps {
  spaceId: number;
  spaceAvatarThumbUrl?: string;
  onCancel?: () => void;
  onSuccess?: (roomId?: number) => void;
}

export default function CreateRoomWindow({ spaceId, spaceAvatarThumbUrl, onCancel, onSuccess }: CreateRoomWindowProps) {
  const userId = useGlobalUserId();
  const getUserInfo = useGetUserInfoQuery(Number(userId));
  const userInfo = getUserInfo.data?.data;
  const roomAvatarUploadId = useId().replace(/:/g, "");
  const roomNameInputId = useId().replace(/:/g, "");

  const createRoomMutation = useCreateRoomMutation(spaceId);
  const getSpaceInfo = useGetSpaceInfoQuery(spaceId);
  const spaceInfo = getSpaceInfo.data?.data;
  const defaultRoomAvatarFileId = spaceInfo?.avatarFileId;
  const defaultRoomAvatar = imageLowUrl(defaultRoomAvatarFileId) || spaceAvatarThumbUrl || undefined;
  const defaultRoomName = userInfo?.username ? `${String(userInfo.username)}的房间` : "";

  const [roomAvatarDraft, setRoomAvatarDraft] = useState<string | null>(null);
  const [roomAvatarFileIdDraft, setRoomAvatarFileIdDraft] = useState<number | undefined>();
  const [roomNameDraft, setRoomNameDraft] = useState<string | null>(null);
  const roomAvatar = roomAvatarDraft ?? defaultRoomAvatar;
  const roomName = roomNameDraft ?? defaultRoomName;
  const isSubmitting = createRoomMutation.isPending;
  const canSubmit = roomName.trim().length > 0 && !isSubmitting;

  const [roomAvatarTextColor, setRoomAvatarTextColor] = useState("text-black");

  useEffect(() => {
    if (roomAvatar) {
      checkBack(roomAvatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setRoomAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [roomAvatar]);

  async function createRoom() {
    if (!canSubmit) {
      return;
    }

    createRoomMutation.mutate({
      spaceId,
      avatarFileId: roomAvatarFileIdDraft ?? defaultRoomAvatarFileId,
      roomName,
      userIdList: [],
    }, {
      onSettled: (data) => {
        const newRoomId = data?.data?.roomId;
        onSuccess?.(newRoomId);
      },
    });
  }

  return (
    <div className="flex h-full min-h-[440px] flex-col">
      <header className="border-b border-base-300/70 pb-4">
        <h3 className="text-lg font-semibold leading-7">房间信息</h3>
      </header>

      <div className="hidden-scrollbar flex-1 overflow-y-auto py-6">
        <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <p className="mb-3 text-sm font-medium text-base-content/70">房间头像</p>
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                setRoomAvatarDraft(url);
              }}
              mutate={(payload) => {
                if (typeof payload?.avatarFileId === "number") {
                  setRoomAvatarFileIdDraft(payload.avatarFileId);
                }
              }}
              fileName={`new-room-avatar-${roomAvatarUploadId}`}
              aspect={1}
              copperedCompressionPreset="avatarThumb"
            >
              <div className="group relative size-28 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-sm">
                <img
                  src={roomAvatar}
                  alt="room avatar"
                  className="size-full object-cover transition duration-200 group-hover:scale-105 group-hover:brightness-75"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-base-100/10 opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100">
                  <span className={`${roomAvatarTextColor} rounded bg-base-100/70 px-2 py-1 text-xs font-semibold`}>
                    上传头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>

          <div>
            <label htmlFor={roomNameInputId} className="mb-2 block text-sm font-medium text-base-content/70">
              房间名称
            </label>
            <input
              id={roomNameInputId}
              type="text"
              value={roomName}
              placeholder={defaultRoomName}
              className="input input-bordered w-full bg-base-100 text-base"
              onChange={(e) => {
                const inputValue = e.target.value;
                setRoomNameDraft(inputValue === "" ? null : inputValue);
              }}
            />
          </div>
        </div>
      </div>

      <footer className="flex justify-end gap-2 border-t border-base-300/70 pt-4">
        {onCancel && (
          <button type="button" className="btn btn-ghost min-w-24" onClick={onCancel}>
            取消
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary min-w-36"
          disabled={!canSubmit}
          onClick={() => {
            void createRoom();
          }}
        >
          {isSubmitting && <span className="loading loading-spinner loading-sm" />}
          <PlusIcon className="size-4" />
          创建房间
        </button>
      </footer>
    </div>
  );
}
