import { PlusIcon, Trash } from "@phosphor-icons/react";
import { useCreateRoomMutation, useGetSpaceInfoQuery } from "api/hooks/chatQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useGetUserRolesQuery } from "api/queryHooks";
import { useEffect, useId, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import checkBack from "@/components/common/autoContrastText";
import { MediaImage } from "@/components/common/mediaImage";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { RoomChatIcon } from "@/icons";
import { imageLowUrl } from "@/utils/media/mediaUrl";

import type { ResolvedImportChatMessage } from "./importChatMessagesWindow";
import type { InitialImportChatMessage } from "./initialChatImport";

import { runCreateRoomPostCreateSteps } from "./createRoomInitialImportFlow";
import { createRoomNameDraftFromInput, resolveCreateRoomNameInputState } from "./createRoomNameDraft";
import ImportChatMessagesWindow from "./importChatMessagesWindow";
import { sendInitialImportChatMessages } from "./initialChatImport";

type CreateRoomWindowProps = {
  spaceId: number;
  spaceAvatarThumbUrl?: string;
  isKP?: boolean;
  onCancel?: () => void;
  onSuccess?: (roomId?: number) => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

type CreateRoomSubmitPhase = "creating" | "importing" | null;

export default function CreateRoomWindow({ spaceId, spaceAvatarThumbUrl, isKP = false, onCancel, onSuccess, onSubmittingChange }: CreateRoomWindowProps) {
  const userId = useGlobalUserId();
  const getUserInfo = useGetUserInfoQuery(Number(userId));
  const userInfo = getUserInfo.data?.data;
  const userRolesQuery = useGetUserRolesQuery(Number(userId));
  const availableRoles = userRolesQuery.data?.data ?? [];
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [initialImportMessages, setInitialImportMessages] = useState<InitialImportChatMessage[]>([]);
  const [submitPhase, setSubmitPhase] = useState<CreateRoomSubmitPhase>(null);
  const [, setImportProgress] = useState<{ sent: number; total: number } | null>(null);
  const roomAvatar = roomAvatarDraft ?? defaultRoomAvatar;
  const { canSubmitRoomName, roomName } = resolveCreateRoomNameInputState(defaultRoomName, roomNameDraft);
  const isSubmitting = submitPhase !== null || createRoomMutation.isPending;
  const canSubmit = canSubmitRoomName && !isSubmitting;

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

  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
    return () => onSubmittingChange?.(false);
  }, [isSubmitting, onSubmittingChange]);

  async function createRoom() {
    if (!canSubmit) {
      return;
    }

    setSubmitPhase("creating");
    setImportProgress(null);
    try {
      const data = await createRoomMutation.mutateAsync({
        spaceId,
        avatarFileId: roomAvatarFileIdDraft ?? defaultRoomAvatarFileId,
        roomName,
        userIdList: [],
      });
      const newRoomId = data?.data?.roomId;

      await runCreateRoomPostCreateSteps({
        roomId: newRoomId,
        initialImportMessages,
        importInitialMessages: (roomId, messages, onProgress) =>
          sendInitialImportChatMessages(roomId, messages, availableRoles, onProgress),
        onImportError: error => appToast.error(error instanceof Error ? error.message : "房间已创建，但初始对话导入失败"),
        onImportSuccess: () => appToast.success("初始对话已导入"),
        onSuccess,
        setImportProgress,
        setSubmitPhase,
      });
    }
    catch {
      appToast.error("创建房间失败");
    }
    finally {
      setSubmitPhase(null);
      setImportProgress(null);
    }
  }

  return (
    <>
      <div className="flex h-full min-h-[440px] flex-col">
        <header className="border-b border-base-300/70 pb-4">
          <h3 className="text-lg/7 font-semibold">房间信息</h3>
        </header>

        <div className="hidden-scrollbar flex-1 overflow-y-auto py-6">
          <div className="
            grid gap-6
            md:grid-cols-[180px_minmax(0,1fr)]
          ">
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
                <div className="
                  group relative size-28 overflow-hidden rounded-lg border
                  border-base-300 bg-base-100 shadow-sm
                ">
                  <MediaImage
                    src={roomAvatar}
                    alt="room avatar"
                    className="
                      size-full object-cover transition duration-200
                      group-hover:scale-105 group-hover:brightness-75
                    "
                    fallbackSrc="/favicon.ico"
                  />
                  <div className="
                    absolute inset-0 flex items-center justify-center
                    bg-base-100/10 opacity-0 backdrop-blur-[2px] transition
                    duration-200
                    group-hover:opacity-100
                  ">
                    <span className={`
                      ${roomAvatarTextColor}
                      rounded bg-base-100/70 px-2 py-1 text-xs font-semibold
                    `}>
                      上传头像
                    </span>
                  </div>
                </div>
              </ImgUploaderWithCopper>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor={roomNameInputId} className="
                  mb-2 block text-sm font-medium text-base-content/70
                ">
                  房间名称
                </label>
                <input
                  id={roomNameInputId}
                  type="text"
                  autoComplete="off"
                  value={roomName}
                  placeholder={defaultRoomName}
                  className="input input-bordered w-full bg-base-100 text-base"
                  disabled={isSubmitting}
                  onChange={(e) => {
                    setRoomNameDraft(createRoomNameDraftFromInput(e.target.value));
                  }}
                />
              </div>

              {isKP && (
                <div className="
                  rounded-lg border border-base-300/70 bg-base-200/30 p-4
                ">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="
                        flex items-center gap-2 text-sm font-semibold
                      ">
                        <RoomChatIcon className="size-4 text-info" />
                        初始对话
                      </div>
                      <p className="mt-1 text-xs text-base-content/55">
                        {initialImportMessages.length > 0
                          ? `已准备 ${initialImportMessages.length} 条，点击创建房间后自动导入。`
                          : "可先粘贴聊天记录，创建后写入这个房间。"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {initialImportMessages.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-square"
                          title="清空初始对话"
                          aria-label="清空初始对话"
                          onClick={() => setInitialImportMessages([])}
                          disabled={isSubmitting}
                        >
                          <Trash className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setIsImportDialogOpen(true)}
                        disabled={isSubmitting}
                      >
                        <RoomChatIcon className="size-4" />
                        {initialImportMessages.length > 0 ? "重新配置" : "导入对话"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="
          flex justify-end gap-2 border-t border-base-300/70 pt-4
        ">
          {onCancel && (
            <button type="button" className="btn btn-ghost min-w-24" onClick={onCancel} disabled={isSubmitting}>
              取消
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary min-w-36"
            disabled={!canSubmit}
            aria-busy={isSubmitting}
            title={!canSubmit ? (isSubmitting ? "正在创建房间" : "请输入房间名称") : undefined}
            onClick={() => {
              void createRoom();
            }}
          >
            {isSubmitting && <span className="
              loading loading-spinner loading-sm
            " />}
            <PlusIcon className="size-4" />
            {isSubmitting ? "创建中..." : "创建房间"}
          </button>
        </footer>
      </div>

      <ToastWindow
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        showCloseButton={false}
        disableScroll
        panelClassName="overflow-hidden rounded-2xl border border-base-300 p-0 shadow-2xl"
        bodyClassName="overflow-hidden"
      >
        <ImportChatMessagesWindow
          availableRoles={availableRoles}
          onImport={async (messages: ResolvedImportChatMessage[]) => {
            setInitialImportMessages(messages);
          }}
          onClose={() => setIsImportDialogOpen(false)}
          submitLabel={(count, importing) => importing ? "正在准备..." : `准备导入 ${count} 条`}
          successMessage="已准备初始对话，创建房间后会自动导入"
        />
      </ToastWindow>
    </>
  );
}
