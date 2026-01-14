import type { BlocksuiteDescriptionEditorActions } from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import {
  useGetSpaceInfoQuery,
  useGetUserSpacesQuery,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
import { tuanchat } from "../../../../api/instance";

function SpaceSettingWindow({
  onClose,
  onEditorActionsChange,
  onEditorModeChange,
  hideEditorModeSwitchButton = false,
}: {
  onClose: () => void;
  onEditorActionsChange?: (actions: BlocksuiteDescriptionEditorActions | null) => void;
  onEditorModeChange?: (mode: "page" | "edgeless") => void;
  hideEditorModeSwitchButton?: boolean;
}) {
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const setActiveSpaceId = spaceContext.setActiveSpaceId;

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

  // 获取规则列表
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
    ruleId: 1,
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

  // 骰娘相关
  const [diceRollerId, setDiceRollerId] = useState(2);
  const latestDiceRollerIdRef = useRef(diceRollerId);
  useEffect(() => {
    latestDiceRollerIdRef.current = diceRollerId;
  }, [diceRollerId]);

  const buildSnapshot = useCallback((data: typeof formData, dicerRoleId: number) => {
    // JSON.stringify 在这里足够；字段量很少。
    return JSON.stringify({
      name: data.name,
      description: data.description,
      avatar: data.avatar,
      ruleId: data.ruleId,
      dicerRoleId,
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
      avatar: space.avatar || "",
      ruleId: space.ruleId || 1,
    });
    didInitFormRef.current = true;

    // 初始化后同步 lastSavedSnapshot，避免首次渲染触发自动保存。
    const extraRaw = space.extra ?? "{}";
    let initialDicerRoleId = latestDiceRollerIdRef.current;
    try {
      const extra = JSON.parse(extraRaw);
      const nextId = Number(extra?.dicerRoleId);
      if (Number.isFinite(nextId) && nextId > 0) {
        initialDicerRoleId = nextId;
      }
    }
    catch {
      // ignore
    }
    lastSavedSnapshotRef.current = buildSnapshot({
      name: space.name || "",
      description: space.description || "",
      avatar: space.avatar || "",
      ruleId: space.ruleId || 1,
    }, initialDicerRoleId);
    dirtyRef.current = false;
  }, [space, buildSnapshot]);

  const didInitDiceRef = useRef(false);
  useEffect(() => {
    if (!space || didInitDiceRef.current)
      return;
    try {
      const extra = JSON.parse(space.extra ?? "{}");
      const nextId = Number(extra?.dicerRoleId);
      if (Number.isFinite(nextId) && nextId > 0) {
        setDiceRollerId(nextId);
      }
    }
    catch {
      // ignore
    }
    didInitDiceRef.current = true;
  }, [space]);

  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false);

  const currentDicerId = useMemo(() => {
    const id = Number(diceRollerId);
    return (Number.isNaN(id) || id <= 0) ? undefined : id;
  }, [diceRollerId]);

  const { data: linkedDicerData } = useGetRoleQuery(currentDicerId || 0);
  const dicerAvatarId = linkedDicerData?.data?.avatarId;
  const { data: dicerAvatarData } = useGetRoleAvatarQuery(dicerAvatarId || 0);
  const dicerAvatarUrl = dicerAvatarData?.data?.avatarUrl || "/favicon.ico";

  const dicerRoleError = useMemo(() => {
    if (!currentDicerId)
      return null;
    const roleData = linkedDicerData?.data;
    if (!roleData)
      return "骰娘角色不存在";
    if (roleData.type !== 1)
      return "关联的角色不是骰娘类型";
    return null;
  }, [currentDicerId, linkedDicerData]);

  const handleBlocksuiteHeaderChange = useCallback((header: { title: string; imageUrl: string }) => {
    setFormData((prev) => {
      const nextName = header.title;
      const nextAvatar = header.imageUrl;
      if (prev.name === nextName && prev.avatar === nextAvatar) {
        return prev;
      }
      return { ...prev, name: nextName, avatar: nextAvatar };
    });
  }, []);

  const updateSpaceMutation = useUpdateSpaceMutation();

  const saveNow = async (params?: { data?: typeof formData; dicerRoleId?: number }) => {
    if (!Number.isFinite(spaceId) || spaceId <= 0)
      return;

    // 未初始化表单时不触发保存，避免覆盖后端已有数据
    if (!didInitFormRef.current)
      return;

    const data = params?.data ?? latestFormDataRef.current;
    const dicerRoleId = params?.dicerRoleId ?? latestDiceRollerIdRef.current;

    const snapshot = buildSnapshot(data, dicerRoleId);
    if (snapshot === lastSavedSnapshotRef.current) {
      dirtyRef.current = false;
      return;
    }

    const updatePromise = new Promise<void>((resolve, reject) => {
      updateSpaceMutation.mutate({
        spaceId,
        name: data.name,
        description: data.description,
        avatar: data.avatar,
        ruleId: data.ruleId,
      }, {
        onSuccess: () => resolve(),
        onError: err => reject(err),
      });
    });

    const extraPromise = tuanchat.spaceController.setSpaceExtra({
      spaceId,
      key: "dicerRoleId",
      value: String(dicerRoleId),
    });

    await Promise.all([updatePromise, extraPromise]);

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
    dirtyRef.current = buildSnapshot(latestFormDataRef.current, latestDiceRollerIdRef.current) !== lastSavedSnapshotRef.current;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  useEffect(() => {
    if (!didInitFormRef.current)
      return;
    scheduleAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceRollerId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiceMaidenLinkConfirm = (dicerRoleId: number) => {
    setDiceRollerId(dicerRoleId);
  };

  return (
    <div className="w-full p-4 min-w-[40vw] h-[80vh] overflow-hidden">
      {!space
        ? (
            <div className="flex items-center justify-center opacity-70">加载中...</div>
          )
        : (
            <div className="h-full flex flex-col md:flex-row gap-4">
              {/* 左侧：空间信息 */}
              <div className="md:w-96 shrink-0 space-y-4 overflow-y-auto">
                {cloneSourceId
                  ? (
                      <div className="mb-4">
                        <label className="label mb-2">
                          <span className="label-text">克隆来源</span>
                        </label>
                        <div className="flex items-center justify-between gap-3 rounded border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                          <div className="text-sm text-neutral-600 dark:text-neutral-300">
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

                <div className="mb-4">
                  <label className="label mb-2">
                    <span className="label-text">空间规则</span>
                  </label>
                  <div className="dropdown w-full">
                    <label tabIndex={0} className="btn btn-outline w-full justify-start">
                      {rules.find(rule => rule.ruleId === formData.ruleId)?.ruleName ?? "未找到规则"}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </label>
                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                      {rules.map(rule => (
                        <li key={rule.ruleId}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, ruleId: Number(rule.ruleId) }));
                              if (document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                              }
                            }}
                          >
                            {rule.ruleName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label mb-2">
                    <span className="label-text">空间骰娘</span>
                  </label>
                  <div
                    className="card bg-base-200 cursor-pointer hover:bg-base-300 transition-all duration-200"
                    onClick={() => setIsDiceMaidenLinkModalOpen(true)}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentDicerId && !dicerRoleError
                            ? (
                                <div className="avatar">
                                  <div className="w-10 h-10 rounded-full ring ring-accent ring-offset-base-100 ring-offset-2">
                                    <img src={dicerAvatarUrl} alt={linkedDicerData?.data?.roleName || "骰娘"} />
                                  </div>
                                </div>
                              )
                            : (
                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                                    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                                    <circle cx="17" cy="17" r="1.5" fill="currentColor" />
                                    <circle cx="7" cy="17" r="1.5" fill="currentColor" />
                                    <circle cx="17" cy="7" r="1.5" fill="currentColor" />
                                  </svg>
                                </div>
                              )}
                          <div>
                            <h3 className="font-semibold text-sm">空间骰娘</h3>
                            <p className={`font-medium text-sm ${dicerRoleError ? "text-error" : "text-accent"}`}>
                              {currentDicerId
                                ? dicerRoleError || linkedDicerData?.data?.roleName || `ID: ${currentDicerId}`
                                : "选择使用的骰娘角色"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-base-content/50">
                          <span className="text-xs">{currentDicerId ? "更改" : "设置"}</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：空间描述文档 */}
              <div className="flex-1 min-w-0 min-h-0">
                <BlocksuiteDescriptionEditor
                  workspaceId={`space:${spaceId}`}
                  spaceId={spaceId}
                  docId={buildSpaceDocId({ kind: "space_description", spaceId })}
                  mode="page"
                  allowModeSwitch
                  fullscreenEdgeless
                  variant="full"
                  className="h-full"
                  hideModeSwitchButton={hideEditorModeSwitchButton}
                  onActionsChange={onEditorActionsChange}
                  onModeChange={onEditorModeChange}
                  tcHeader={{ enabled: true, fallbackTitle: space?.name ?? "", fallbackImageUrl: space?.avatar ?? "" }}
                  onTcHeaderChange={({ header }) => {
                    handleBlocksuiteHeaderChange({ title: header.title, imageUrl: header.imageUrl });
                  }}
                />
              </div>
            </div>
          )}

      <DiceMaidenLinkModal
        isOpen={isDiceMaidenLinkModalOpen}
        onClose={() => setIsDiceMaidenLinkModalOpen(false)}
        currentDicerRoleId={currentDicerId}
        onConfirm={handleDiceMaidenLinkConfirm}
      />
    </div>
  );
}

export default SpaceSettingWindow;
