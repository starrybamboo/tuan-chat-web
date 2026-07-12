import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buttonClassName } from "@/components/common/Button";
import { invalidateDicerRoleResolveCache } from "@/components/common/dicer/utils/utils";
import { FieldLabel } from "@/components/common/FormField";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { DropdownMenu, MenuItem } from "@/components/common/MenuPopover";
import { MediaImage } from "@/components/common/mediaImage";
import { useResolvedRoleAvatarUrl } from "@/components/common/roleAccess.shared";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
// 跑团设置页面：集中管理空间规则与空间骰娘，成员可见，空间拥有者可编辑。
import {
  useGetSpaceInfoQuery,
  useSetSpaceExtraMutation,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";

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
  const linkedDicerRole = linkedDicerData?.data;
  const dicerAvatarUrl = useResolvedRoleAvatarUrl(linkedDicerRole, "/favicon.ico");

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
  const setSpaceExtraMutation = useSetSpaceExtraMutation();
  const saveNow = async (params?: { dicerRoleId?: number; ruleId?: number }) => {
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

    const extraPromise = setSpaceExtraMutation.mutateAsync({
      spaceId,
      key: "dicerRoleId",
      value: String(dicerRoleId),
    });

    await Promise.all([updatePromise, extraPromise]);
    invalidateDicerRoleResolveCache(spaceId);

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
        appToast.error("跑团设置自动保存失败，将自动重试");
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

    dirtyRef.current = buildSnapshot(
      latestRuleIdRef.current,
      latestDiceRollerIdRef.current,
    ) !== lastSavedSnapshotRef.current;
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
  }, [ruleId]);

  useEffect(() => {
    if (!didInitRef.current)
      return;
    scheduleAutoSave();
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
                <FieldLabel className="mb-2">空间规则</FieldLabel>
                <DropdownMenu
                  ariaLabel="选择空间规则"
                  className="w-full"
                  matchTriggerWidth
                  menuClassName="p-2 shadow"
                  trigger={(
                    <button
                      type="button"
                      disabled={!canEdit}
                      className={buttonClassName({
                        variant: "outline",
                        className: "w-full justify-start",
                      })}
                      title={!canEdit ? "无编辑权限" : undefined}
                    >
                      {rules.find(rule => rule.ruleId === ruleId)?.ruleName ?? "未找到规则"}
                      <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                >
                  {canEdit && (
                    <>
                      {rules.map(rule => (
                        <li key={rule.ruleId} role="none">
                          <MenuItem
                            selected={Number(rule.ruleId) === ruleId}
                            onClick={() => {
                              setRuleId(Number(rule.ruleId));
                              if (document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                              }
                            }}
                          >
                            {rule.ruleName}
                          </MenuItem>
                        </li>
                      ))}
                    </>
                  )}
                </DropdownMenu>
              </div>

              <div className="mb-4">
                <FieldLabel className="mb-2">空间骰娘</FieldLabel>
                <div
                  className={surfaceClassName({ level: "inset", className: `
                    transition-colors duration-200
                    motion-reduce:transition-none
                    ${canEdit ? `
                      cursor-pointer
                      hover:bg-base-300
                    ` : `cursor-not-allowed opacity-70`}
                  ` })}
                  role="button"
                  tabIndex={canEdit ? 0 : -1}
                  aria-disabled={!canEdit}
                  title={!canEdit ? "无编辑权限" : undefined}
                  onClick={() => {
                    if (canEdit) {
                      setIsDiceMaidenLinkModalOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!canEdit) {
                      return;
                    }
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setIsDiceMaidenLinkModalOpen(true);
                    }
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {currentDicerId && !dicerRoleError
                          ? (
                              <div className="relative inline-flex align-middle">
                                <div className="
                                  size-10 rounded-full ring ring-info
                                  ring-offset-base-100 ring-offset-2
                                ">
                                  <MediaImage
                                    src={dicerAvatarUrl}
                                    alt={linkedDicerData?.data?.roleName || "骰娘"}
                                    className="size-full object-cover"
                                  />
                                </div>
                              </div>
                            )
                          : (
                              <div className="
                                size-10 rounded-full bg-base-200 flex
                                items-center justify-center
                              ">
                                <svg className="size-5 text-base-content/70" viewBox="0 0 24 24" fill="currentColor">
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
                          <p className={`
                            font-medium text-sm
                            ${dicerRoleError ? `text-error` : `text-base-content/70`}
                          `}>
                            {currentDicerId
                              ? dicerRoleError || linkedDicerData?.data?.roleName || `ID: ${currentDicerId}`
                              : "选择使用的骰娘角色"}
                          </p>
                        </div>
                      </div>
                      <div className="
                        flex items-center gap-1 text-base-content/50
                      ">
                        <span className="text-xs">{currentDicerId ? "更改" : "设置"}</span>
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
