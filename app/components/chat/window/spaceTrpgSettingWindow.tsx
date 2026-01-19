// 跑团设置页面：集中管理空间规则与空间骰娘，成员可见，空间拥有者可编辑。
import {
  useGetSpaceInfoQuery,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
import { tuanchat } from "../../../../api/instance";

function SpaceTrpgSettingWindow() {
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const canEdit = spaceContext.isSpaceOwner;

  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;

  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  const [ruleId, setRuleId] = useState(1);
  const [diceRollerId, setDiceRollerId] = useState(2);
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false);

  const latestRuleIdRef = useRef(ruleId);
  const latestDiceRollerIdRef = useRef(diceRollerId);
  useEffect(() => {
    latestRuleIdRef.current = ruleId;
  }, [ruleId]);
  useEffect(() => {
    latestDiceRollerIdRef.current = diceRollerId;
  }, [diceRollerId]);

  // 自动保存状态管理（防抖 + 并发合并 + 失败重试）
  const buildSnapshot = useCallback((nextRuleId: number, dicerRoleId: number) => {
    return JSON.stringify({
      ruleId: nextRuleId,
      dicerRoleId,
    });
  }, []);

  const lastSavedSnapshotRef = useRef<string>("");
  const dirtyRef = useRef(false);
  const saveDebounceTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryDelayMsRef = useRef(2000);
  const isSavingRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const lastFailureToastAtRef = useRef(0);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (!space || didInitRef.current)
      return;

    const nextRuleId = Number(space.ruleId) || 1;
    let initialDicerRoleId = latestDiceRollerIdRef.current;
    try {
      const extra = JSON.parse(space.extra ?? "{}");
      const nextId = Number(extra?.dicerRoleId);
      if (Number.isFinite(nextId) && nextId > 0) {
        initialDicerRoleId = nextId;
      }
    }
    catch {
      // ignore
    }

    setRuleId(nextRuleId);
    setDiceRollerId(initialDicerRoleId);

    lastSavedSnapshotRef.current = buildSnapshot(nextRuleId, initialDicerRoleId);
    dirtyRef.current = false;
    didInitRef.current = true;
  }, [space, buildSnapshot]);

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

  const updateSpaceMutation = useUpdateSpaceMutation();
  const saveNow = async (params?: { ruleId?: number; dicerRoleId?: number }) => {
    if (!canEdit)
      return;
    if (!Number.isFinite(spaceId) || spaceId <= 0)
      return;
    if (!didInitRef.current)
      return;

    const nextRuleId = params?.ruleId ?? latestRuleIdRef.current;
    const dicerRoleId = params?.dicerRoleId ?? latestDiceRollerIdRef.current;

    const snapshot = buildSnapshot(nextRuleId, dicerRoleId);
    if (snapshot === lastSavedSnapshotRef.current) {
      dirtyRef.current = false;
      return;
    }

    const updatePromise = new Promise<void>((resolve, reject) => {
      updateSpaceMutation.mutate({
        spaceId,
        ruleId: nextRuleId,
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
      const now = Date.now();
      if (now - lastFailureToastAtRef.current > 3000) {
        toast.error("跑团设置自动保存失败，将自动重试");
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
        if (dirtyRef.current) {
          void flushAutoSave();
        }
      }
    }
  };

  const scheduleAutoSave = () => {
    if (!didInitRef.current || !canEdit)
      return;

    dirtyRef.current = buildSnapshot(latestRuleIdRef.current, latestDiceRollerIdRef.current) !== lastSavedSnapshotRef.current;
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

  useEffect(() => {
    if (!didInitRef.current)
      return;
    scheduleAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleId]);

  useEffect(() => {
    if (!didInitRef.current)
      return;
    scheduleAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceRollerId]);

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
      void saveNow();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiceMaidenLinkConfirm = (dicerRoleId: number) => {
    if (!canEdit)
      return;
    setDiceRollerId(dicerRoleId);
  };

  return (
    <div className="w-full p-4 min-w-[40vw] h-[80vh] overflow-hidden">
      {!space
        ? (
            <div className="flex items-center justify-center opacity-70">加载中...</div>
          )
        : (
            <div className="h-full space-y-4 overflow-y-auto">
              <div className="mb-4">
                <label className="label mb-2">
                  <span className="label-text">空间规则</span>
                </label>
                <div className="dropdown w-full">
                  <label
                    tabIndex={canEdit ? 0 : -1}
                    className={`btn btn-outline w-full justify-start ${canEdit ? "" : "cursor-not-allowed opacity-70"}`}
                    aria-disabled={!canEdit}
                    onClick={(event) => {
                      if (!canEdit) {
                        event.preventDefault();
                        event.stopPropagation();
                      }
                    }}
                  >
                    {rules.find(rule => rule.ruleId === ruleId)?.ruleName ?? "未找到规则"}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </label>
                  {canEdit && (
                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
                      {rules.map(rule => (
                        <li key={rule.ruleId}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              setRuleId(Number(rule.ruleId));
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
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="label mb-2">
                  <span className="label-text">空间骰娘</span>
                </label>
                <div
                  className={`card bg-base-200 transition-all duration-200 ${canEdit ? "cursor-pointer hover:bg-base-300" : "cursor-not-allowed opacity-70"}`}
                  onClick={() => {
                    if (canEdit) {
                      setIsDiceMaidenLinkModalOpen(true);
                    }
                  }}
                  aria-disabled={!canEdit}
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

export default SpaceTrpgSettingWindow;
