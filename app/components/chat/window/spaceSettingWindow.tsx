import { SpaceContext } from "@/components/chat/core/spaceContext";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import checkBack from "@/components/common/autoContrastText";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
import {
  useGetSpaceInfoQuery,
  useGetUserSpacesQuery,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { tuanchat } from "../../../../api/instance";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
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

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  // 表单数据
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: "",
    ruleId: 1,
  });

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
  }, [space]);

  // 骰娘相关
  const [diceRollerId, setDiceRollerId] = useState(2);
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

  // 头像文字颜色
  const [avatarTextColor, setAvatarTextColor] = useState("text-black");
  useEffect(() => {
    if (!formData.avatar)
      return;
    checkBack(formData.avatar).then(() => {
      const computedColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--text-color")
        .trim();
      setAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
    });
  }, [formData.avatar]);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    setUploaderKey(prev => prev + 1);
  };

  const updateSpaceMutation = useUpdateSpaceMutation();

  const handleSave = () => {
    if (!space || !Number.isFinite(spaceId) || spaceId <= 0)
      return;

    updateSpaceMutation.mutate({
      spaceId,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
      ruleId: formData.ruleId,
    });
    tuanchat.spaceController.setSpaceExtra({
      spaceId,
      key: "dicerRoleId",
      value: String(diceRollerId),
    });
  };

  // 离开空间资料时自动保存
  useEffect(() => {
    return () => {
      handleSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDiceMaidenLinkConfirm = (dicerRoleId: number) => {
    setDiceRollerId(dicerRoleId);
  };

  return (
    <div className="w-full p-4 min-w-[40vw] max-h-[80vh] overflow-y-auto">
      {!space
        ? (
            <div className="flex items-center justify-center opacity-70">加载中...</div>
          )
        : (
            <div className="flex flex-col md:flex-row gap-4">
              {/* 左侧：空间信息 */}
              <div className="md:w-96 shrink-0 space-y-4">
                <div className="card bg-base-100 border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex justify-center">
                      <ImgUploaderWithCopper
                        key={uploaderKey}
                        setCopperedDownloadUrl={handleAvatarUpdate}
                        fileName={`spaceId-${space.spaceId}`}
                      >
                        <div className="relative group overflow-hidden rounded-lg">
                          <img
                            src={formData.avatar || space.avatar}
                            alt={formData.name}
                            className="w-24 h-24 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm">
                            <span className={`${avatarTextColor} font-bold px-2 py-1 rounded`}>
                              更新头像
                            </span>
                          </div>
                        </div>
                      </ImgUploaderWithCopper>
                    </div>

                    <div className="mt-4">
                      <label className="label mb-2">
                        <span className="label-text">空间名称</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        className="input input-bordered w-full"
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, name: e.target.value }));
                        }}
                        placeholder="请输入空间名称..."
                      />
                    </div>
                  </div>
                </div>

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
              <div className="flex-1 min-w-0">
                <BlocksuiteDescriptionEditor
                  spaceId={spaceId}
                  docId={buildSpaceDocId({ kind: "space_description" })}
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
