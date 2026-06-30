import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { MediaImage } from "@/components/common/mediaImage";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { imageLowUrl } from "@/utils/media/mediaUrl";
import {
  useGetSpaceInfoQuery,
  useGetUserSpacesQuery,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const setActiveSpaceId = spaceContext.setActiveSpaceId;
  const spaceAvatarUploadId = useId().replace(/:/g, "");

  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;

  const userSpacesQuery = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const cloneSourceId = space?.parentCommitId;
  const cloneSourceSpace = useMemo(() => {
    if (!cloneSourceId)
      return undefined;
    return userSpaces.find(s => s.spaceId === cloneSourceId);
  }, [cloneSourceId, userSpaces]);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
    avatarFileId: undefined as number | undefined,
  });

  // 自动保存状态管理（防抖 + 并发合并 + 失败重试）
  const lastSavedSnapshotRef = useRef<string>("");
  const dirtyRef = useRef(false);
  const saveDebounceTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryDelayMsRef = useRef(2000);
  const isSavingRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const lastFailureToastAtRef = useRef(0);

  const buildSnapshot = useCallback((data: typeof formData) => {
    // JSON.stringify 在这里足够；字段量很少。
    return JSON.stringify({
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      avatarFileId: data.avatarFileId,
    });
  }, []);

  // 让卸载时的自动保存拿到最新值（避免闭包捕获初始 state）
  const latestFormDataRef = useRef(formData);
  useEffect(() => {
    latestFormDataRef.current = formData;
  }, [formData]);

  // 初始化表单（仅一次）
  const didInitFormRef = useRef(false);
  useEffect(() => {
    if (!space || didInitFormRef.current)
      return;

    setFormData({
      name: space.name || "",
      description: space.description || "",
      avatar: imageLowUrl(space.avatarFileId),
      avatarFileId: space.avatarFileId,
    });
    didInitFormRef.current = true;

    // 初始化后同步 lastSavedSnapshot，避免首次渲染触发自动保存。
    lastSavedSnapshotRef.current = buildSnapshot({
      name: space.name || "",
      description: space.description || "",
      avatar: imageLowUrl(space.avatarFileId),
      avatarFileId: space.avatarFileId,
    });
    dirtyRef.current = false;
  }, [space, buildSnapshot]);

  const updateSpaceMutation = useUpdateSpaceMutation();
  const spaceAvatarPreview = formData.avatar || imageLowUrl(formData.avatarFileId) || undefined;

  const saveNow = async (params?: { data?: typeof formData }) => {
    if (!Number.isFinite(spaceId) || spaceId <= 0)
      return;

    // 未初始化表单时不触发保存，避免覆盖后端已有数据
    if (!didInitFormRef.current)
      return;

    const data = params?.data ?? latestFormDataRef.current;

    const snapshot = buildSnapshot(data);
    if (snapshot === lastSavedSnapshotRef.current) {
      dirtyRef.current = false;
      return;
    }

    const updatePromise = new Promise<void>((resolve, reject) => {
      updateSpaceMutation.mutate({
        spaceId,
        name: data.name,
        description: data.description,
        avatarFileId: data.avatarFileId,
      }, {
        onSuccess: () => resolve(),
        onError: err => reject(err),
      });
    });
    await updatePromise;

    lastSavedSnapshotRef.current = snapshot;
    dirtyRef.current = false;
    retryDelayMsRef.current = 2000;
  };

  const flushAutoSave = async () => {
    if (isSavingRef.current) {
      saveQueuedRef.current = true;
      return;
    }
    if (!dirtyRef.current)
      return;

    isSavingRef.current = true;
    try {
      await saveNow();
    }
    catch {
      // 失败提示（节流，避免疯狂刷 toast）
      const now = Date.now();
      if (now - lastFailureToastAtRef.current > 3000) {
        toast.error("空间设置自动保存失败，将自动重试");
        lastFailureToastAtRef.current = now;
      }

      dirtyRef.current = true;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      const delay = retryDelayMsRef.current;
      retryDelayMsRef.current = Math.min(Math.floor(retryDelayMsRef.current * 1.6), 30000);
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        flushAutoSave();
      }, delay);
    }
    finally {
      isSavingRef.current = false;
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        // 如果在保存期间有新改动，立刻再 flush 一次。
        if (dirtyRef.current) {
          void flushAutoSave();
        }
      }
    }
  };

  const scheduleAutoSave = () => {
    if (!didInitFormRef.current)
      return;

    // 标记 dirty
    dirtyRef.current = buildSnapshot(latestFormDataRef.current) !== lastSavedSnapshotRef.current;
    if (!dirtyRef.current)
      return;

    if (saveDebounceTimerRef.current) {
      window.clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }
    saveDebounceTimerRef.current = window.setTimeout(() => {
      saveDebounceTimerRef.current = null;
      void flushAutoSave();
    }, 800);
  };

  // 监听变更：自动保存
  useEffect(() => {
    if (!didInitFormRef.current)
      return;
    scheduleAutoSave();
  }, [formData]);

  // 离开空间资料时自动保存（兜底）
  useEffect(() => {
    return () => {
      if (saveDebounceTimerRef.current) {
        window.clearTimeout(saveDebounceTimerRef.current);
        saveDebounceTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      // 直接保存一次（不防抖），确保关闭时尽量落库。
      // 这里不 await，避免阻塞卸载流程。
      void saveNow();
    };
  }, []);

  return (
    <div className="size-full min-w-0 min-h-0 overflow-hidden">
      {!space
        ? (
            <div className="flex items-center justify-center opacity-70">加载中...</div>
          )
        : (
            <div className="h-full min-h-0 flex flex-col gap-4">
              {/* 左侧：空间信息 */}
              {cloneSourceId
                ? (
                    <div className="mb-4">
                      <label className="label mb-2">
                        <span className="label-text">克隆来源</span>
                      </label>
                      <div className="
                        flex items-center justify-between gap-3 rounded border
                        border-neutral-200
                        dark:border-neutral-700
                        px-3 py-2
                      ">
                        <div className="
                          text-sm text-neutral-600
                          dark:text-neutral-300
                        ">
                          {cloneSourceSpace?.name
                            ? (
                                <>
                                  {cloneSourceSpace.name}
                                  <span className="ml-2 text-xs opacity-70">
                                    (ID:
                                    {cloneSourceId}
                                    )
                                  </span>
                                </>
                              )
                            : (
                                <>
                                  来源ID:
                                  {" "}
                                  {cloneSourceId}
                                  <span className="ml-2 text-xs opacity-70">(未在当前列表中找到空间名称)</span>
                                </>
                              )}
                        </div>

                        {cloneSourceSpace?.spaceId
                          ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => {
                                  setActiveSpaceId(cloneSourceSpace.spaceId!);
                                  onClose();
                                }}
                              >
                                前往
                              </button>
                            )
                          : null}
                      </div>
                    </div>
                  )
                : null}

              <div className="flex-1 min-w-0 min-h-0 overflow-y-auto p-4">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                  <div className="form-control">
                    <div className="label">
                      <span className="label-text">空间头像</span>
                    </div>
                    <ImgUploaderWithCopper
                      mutate={(payload) => {
                        if (typeof payload?.avatarFileId !== "number") {
                          return;
                        }
                        setFormData(prev => ({
                          ...prev,
                          avatar: payload.avatarUrl || imageLowUrl(payload.avatarFileId),
                          avatarFileId: payload.avatarFileId,
                        }));
                      }}
                      fileName={`space-${spaceId}-avatar-${spaceAvatarUploadId}`}
                      aspect={1}
                      copperedCompressionPreset="avatarThumb"
                    >
                      <div className="
                        group relative size-28 cursor-pointer overflow-hidden rounded-lg
                        border border-base-300 bg-base-100 shadow-sm
                      ">
                        <MediaImage
                          src={spaceAvatarPreview}
                          alt={formData.name || "空间头像"}
                          className="
                            size-full object-cover transition duration-200
                            group-hover:scale-105 group-hover:brightness-75
                          "
                          fallbackSrc="/favicon.ico"
                        />
                        <div className="
                          absolute inset-0 flex items-center justify-center
                          bg-black/20 opacity-0 transition duration-200
                          group-hover:opacity-100
                        ">
                          <span className="rounded bg-base-100/85 px-2 py-1 text-xs font-medium text-base-content">
                            更换头像
                          </span>
                        </div>
                      </div>
                    </ImgUploaderWithCopper>
                  </div>

                  <label className="form-control">
                    <div className="label">
                      <span className="label-text">空间名称</span>
                    </div>
                    <input
                      className="input input-bordered w-full"
                      value={formData.name}
                      onChange={(event) => {
                        setFormData(prev => ({ ...prev, name: event.target.value }));
                      }}
                    />
                  </label>

                  <label className="form-control">
                    <div className="label">
                      <span className="label-text">空间描述</span>
                    </div>
                    <textarea
                      className="
                        textarea textarea-bordered min-h-40 w-full resize-y
                      "
                      value={formData.description}
                      onChange={(event) => {
                        setFormData(prev => ({ ...prev, description: event.target.value }));
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

    </div>
  );
}

export default SpaceSettingWindow;
