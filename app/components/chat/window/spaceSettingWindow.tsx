import { SpaceContext } from "@/components/chat/core/spaceContext";
import checkBack from "@/components/common/autoContrastText";
import ConfirmModal from "@/components/common/comfirmModel";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import MemberInfoComponent from "@/components/common/memberInfo";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
import {
  useCloneSpaceBySpaceIdMutation,
  useDissolveSpaceMutation,
  useGetSpaceInfoQuery,
  useGetSpaceMembersQuery,
  useGetUserSpacesQuery,
  useTransferLeader,
  useUpdateSpaceArchiveStatusMutation,
  useUpdateSpaceMutation,
} from "api/hooks/chatQueryHooks";
import { useGetRoleAvatarQuery, useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { tuanchat } from "../../../../api/instance";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const spaceContext = React.use(SpaceContext);
  const spaceId = Number(spaceContext.spaceId);
  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;
  const setActiveSpaceId = spaceContext.setActiveSpaceId;

  const userSpacesQuery = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => userSpacesQuery.data?.data ?? [], [userSpacesQuery.data?.data]);

  const cloneSourceId = space?.parentCommitId;
  const cloneSourceSpace = useMemo(() => {
    if (!cloneSourceId)
      return undefined;
    return userSpaces.find(s => s.spaceId === cloneSourceId);
  }, [cloneSourceId, userSpaces]);

  // 控制成员列表弹窗打开
  const [isMembersListHandleOpen, setIsMembersListHandleOpen] = useSearchParamsState<boolean>("memberListPop", false);

  // 获取规则列表
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];

  // 获取空间非主持人成员
  const getSpaceMembersQuery = useGetSpaceMembersQuery(spaceId);
  const allMembers = getSpaceMembersQuery.data?.data ?? [];
  const members = allMembers?.filter(member => member.memberType !== 1) ?? [];

  // 处理用户uid
  const [inputUserId, setInputUserId] = useState<number>(-1);

  // 空间归档状态
  const [isArchived, setIsArchived] = useState(space?.status === 2);

  // 设置归档状态
  const updateAchiveStatusMutation = useUpdateSpaceArchiveStatusMutation();

  // 用于强制重置上传组件
  const [uploaderKey, setUploaderKey] = useState(0);

  // 使用状态管理表单数据
  const [formData, setFormData] = useState({
    name: space?.name || "",
    description: space?.description || "",
    avatar: space?.avatar || "",
    ruleId: space?.ruleId || 1,
  });

  // 使用骰娘id数据与自定义 DicerRole 开关
  const [diceRollerId, setDiceRollerId] = useState<number>(2);
  const [allowCustomDicerRole, setAllowCustomDicerRole] = useState<boolean>(true);

  const parsedSpaceExtra = useMemo(() => {
    if (!space?.extra)
      return {} as Record<string, unknown>;
    try {
      return JSON.parse(space.extra) as Record<string, unknown>;
    }
    catch (err) {
      console.error("解析 space.extra 失败", err);
      return {} as Record<string, unknown>;
    }
  }, [space?.extra]);

  useEffect(() => {
    if (!space)
      return;
    const extraRecord = parsedSpaceExtra as Record<string, unknown>;
    const rawDicerId = Number(extraRecord.dicerRoleId ?? space.dicerRoleId ?? 2);
    setDiceRollerId(Number.isNaN(rawDicerId) ? 2 : rawDicerId);

    const rawAllow = extraRecord.allowCustomDicerRole;
    const allowFlag = rawAllow === undefined ? true : rawAllow === true || rawAllow === "true";
    setAllowCustomDicerRole(allowFlag);
  }, [space, parsedSpaceExtra]);

  // 骰娘关联弹窗状态
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false);

  // 查询当前骰娘信息
  const currentDicerId = useMemo(() => {
    const id = Number(diceRollerId);
    return (Number.isNaN(id) || id <= 0) ? undefined : id;
  }, [diceRollerId]);

  const isCustomDicerDisabled = useMemo(() => !allowCustomDicerRole, [allowCustomDicerRole]);

  const { data: linkedDicerData } = useGetRoleQuery(currentDicerId || 0);

  // 查询骰娘头像
  const dicerAvatarId = linkedDicerData?.data?.avatarId;
  const { data: dicerAvatarData } = useGetRoleAvatarQuery(dicerAvatarId || 0);
  const dicerAvatarUrl = dicerAvatarData?.data?.avatarUrl || "/favicon.ico";

  // 验证骰娘是否有效
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

  // 监听头像变化，自动调整文字颜色
  useEffect(() => {
    if (formData.avatar) {
      checkBack(formData.avatar).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setAvatarTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [formData.avatar]);

  const handleAvatarUpdate = (url: string) => {
    setFormData(prev => ({ ...prev, avatar: url }));
    // 上传完成后强制重置上传组件
    setUploaderKey(prev => prev + 1);
  };

  // 转让空间
  const transferLeader = useTransferLeader();

  // 当space数据加载时初始化formData
  if (space && formData.name === "" && formData.description === "" && formData.avatar === "") {
    setFormData({
      name: space.name || "",
      description: space.description || "",
      avatar: space.avatar || "",
      ruleId: space.ruleId || 1,
    });
  }

  const dissolveSpaceMutation = useDissolveSpaceMutation();
  const updateSpaceMutation = useUpdateSpaceMutation();
  const cloneSpaceBySpaceIdMutation = useCloneSpaceBySpaceIdMutation();

  // 处理骰娘关联确认
  const handleDiceMaidenLinkConfirm = (dicerRoleId: number) => {
    setDiceRollerId(dicerRoleId);
  };

  // 保存数据函数
  const handleSave = () => {
    updateSpaceMutation.mutate({
      spaceId,
      name: formData.name,
      description: formData.description,
      avatar: formData.avatar,
      ruleId: formData.ruleId,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
    tuanchat.spaceController.setSpaceExtra({
      spaceId,
      key: "dicerRoleId",
      value: String(diceRollerId),
    });
    tuanchat.spaceController.setSpaceExtra({
      spaceId,
      key: "allowCustomDicerRole",
      value: String(allowCustomDicerRole),
    });
  };

  // 退出时自动保存
  const handleClose = () => {
    handleSave();
  };

  // 控制更新归档状态的确认弹窗显示
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  // 控制删除空间的确认弹窗显示
  const [isDissolveConfirmOpen, setIsDissolveConfirmOpen] = useState(false);
  // 控制克隆空间的确认弹窗显示
  const [isCloneConfirmOpen, setIsCloneConfirmOpen] = useState(false);
  // 控制转让空间的确认弹窗显示
  const [isTransferOwnerConfirmOpen, setIsTransferOwnerConfirmOpen] = useState(false);
  // 转让的用户Id
  const [transfereeId, setTransfereeId] = useState(-1);

  return (
    <div className="w-full p-4 min-w-[40vw] h-[85vh] overflow-y-auto">
      {space && (
        <div className="space-y-6">
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-6 max-w-lg">
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                  <div className="card-body items-center text-center gap-4">
                    <ImgUploaderWithCopper
                      key={uploaderKey}
                      setCopperedDownloadUrl={handleAvatarUpdate}
                      fileName={`spaceId-${space.spaceId}`}
                    >
                      <div className="relative group overflow-hidden rounded-xl">
                        <img
                          src={formData.avatar || space.avatar}
                          alt={formData.name}
                          className="w-28 h-28 object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-75 rounded-xl"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/30">
                          <span className={`${avatarTextColor} font-semibold text-sm px-3 py-1 rounded-lg bg-black/20`}>更新头像</span>
                        </div>
                      </div>
                    </ImgUploaderWithCopper>
                    <div className="w-full text-left space-y-3">
                      <div className="form-control">
                        <label className="label mb-1">
                          <span className="label-text text-sm">空间名称</span>
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
                      {cloneSourceId
                        ? (
                            <div className="rounded-xl border border-base-200 bg-base-100/60 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm leading-relaxed text-base-content/70">
                                  <span className="block text-base-content font-medium mb-1">克隆来源</span>
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
                                        className="btn btn-sm btn-outline"
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
                    </div>
                  </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm">
                  <div className="card-body gap-4">
                    <div className="form-control">
                      <label className="label mb-1">
                        <span className="label-text text-sm">空间骰娘</span>
                      </label>
                      <div
                        className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
                        onClick={() => setIsDiceMaidenLinkModalOpen(true)}
                      >
                        <div className="card-body p-4">
                          <div className="flex items-center justify-between gap-3">
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
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">空间骰娘</span>
                                  <span className={`badge badge-sm badge-outline ${isCustomDicerDisabled ? "" : "invisible"}`}>已禁用自定义骰娘</span>
                                </div>
                                <p className={`text-sm font-medium ${dicerRoleError ? "text-error" : "text-accent"}`}>
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
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-base-200 px-4 py-3">
                      <div>
                        <p className="font-medium text-sm">允许自定义骰娘</p>
                        <p className="text-xs text-base-content/70">关闭后成员仅能使用空间配置的骰娘。</p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-accent"
                        checked={allowCustomDicerRole}
                        onChange={e => setAllowCustomDicerRole(e.target.checked)}
                      />
                    </div>
                    <div className="form-control flex items-center gap-3">
                      <label className="label mb-1">
                        <span className="label-text text-sm">空间规则</span>
                      </label>
                      <div className="dropdown w-full">
                        <label tabIndex={0} className="btn btn-outline w-full justify-start">
                          {rules.find(rule => rule.ruleId === formData.ruleId)?.ruleName ?? "未找到规则"}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </label>
                        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full max-h-60 overflow-y-auto">
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
                  </div>
                </div>

                <div className="card bg-base-100 border border-base-200 shadow-sm">
                  <div className="card-body gap-4">
                    <h3 className="text-lg font-semibold">空间管理</h3>
                    <div className="flex flex-wrap gap-3 w-full">
                      <button
                        type="button"
                        className="btn btn-error flex-1 min-w-[140px]"
                        onClick={() => setIsDissolveConfirmOpen(true)}
                      >
                        解散空间
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline flex-1 min-w-[140px]"
                        onClick={() => setIsCloneConfirmOpen(true)}
                        disabled={cloneSpaceBySpaceIdMutation.isPending}
                      >
                        克隆
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary flex-1 min-w-[140px]"
                        onClick={() => setIsArchiveConfirmOpen(true)}
                      >
                        {isArchived ? "取消归档" : "归档"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-accent flex-1 min-w-[140px]"
                        onClick={() => setIsMembersListHandleOpen(true)}
                      >
                        转让空间
                      </button>
                      <button
                        type="button"
                        className="btn btn-success flex-1 min-w-[140px]"
                        onClick={handleClose}
                      >
                        保存并关闭
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="card bg-base-100 border border-base-200 shadow-sm">
                  <div className="card-body gap-4">
                    <h3 className="text-lg font-semibold">基础信息</h3>
                    <div className="form-control">
                      <label className="label mb-1">
                        <span className="label-text text-sm">空间描述</span>
                      </label>
                      <textarea
                        value={formData.description}
                        className="textarea textarea-bordered w-full min-h-[140px]"
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, description: e.target.value }));
                        }}
                        rows={5}
                        placeholder="请输入空间描述..."
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <PopWindow isOpen={isMembersListHandleOpen} onClose={() => setIsMembersListHandleOpen(false)}>
            <div className="flex flex-col gap-y-3 pb-4 min-w-72">
              <div className="form-control">
                <label className="label mb-1">
                  <span className="label-text text-sm">搜索玩家Id</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入要加入的玩家ID"
                  className="input input-bordered w-full"
                  onInput={e => setInputUserId(Number(e.currentTarget.value))}
                />
              </div>
              <div className="flex flex-col gap-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {(() => {
                  if (members.length === 0) {
                    return (
                      <div className="text-center py-6 text-base-content/60">
                        当前空间内没有玩家哦
                      </div>
                    );
                  }

                  const matchedMember = inputUserId > 0
                    ? members.find(member => member.userId === inputUserId)
                    : null;
                  const memberToShow = matchedMember ? [matchedMember] : members;

                  return memberToShow.map(member => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-4 rounded-lg border border-base-200 bg-base-100 px-3 py-2"
                    >
                      <MemberInfoComponent userId={member.userId ?? -1} />
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setIsTransferOwnerConfirmOpen(true);
                          setTransfereeId(member.userId ?? -1);
                          setIsMembersListHandleOpen(false);
                        }}
                      >
                        转让
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </PopWindow>

          <ConfirmModal
            isOpen={isArchiveConfirmOpen}
            onClose={() => setIsArchiveConfirmOpen(false)}
            title="确认更新归档状态"
            message={`是否确定要${isArchived ? "取消归档" : "归档"}该空间？`}
            onConfirm={() => {
              updateAchiveStatusMutation.mutate({ spaceId, archived: !isArchived }, {
                onSuccess: () => {
                  setIsArchived(!isArchived);
                  setIsArchiveConfirmOpen(false);
                },
              });
            }}
          />

          <ConfirmModal
            isOpen={isCloneConfirmOpen}
            onClose={() => setIsCloneConfirmOpen(false)}
            title="确认克隆空间"
            message="是否确定要克隆该空间？将创建一个新的空间副本。"
            onConfirm={() => {
              cloneSpaceBySpaceIdMutation.mutate(spaceId, {
                onSuccess: (res) => {
                  const newSpaceId = Number(res?.data);
                  setIsCloneConfirmOpen(false);
                  if (!Number.isNaN(newSpaceId) && newSpaceId > 0) {
                    setActiveSpaceId(newSpaceId);
                  }
                  onClose();
                },
              });
            }}
          />

          <ConfirmModal
            isOpen={isDissolveConfirmOpen}
            onClose={() => setIsDissolveConfirmOpen(false)}
            title="确认解散空间"
            message="是否确定要解散该空间？此操作不可逆。"
            onConfirm={() => {
              dissolveSpaceMutation.mutate(spaceId, {
                onSuccess: () => {
                  onClose();
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("storedChatIds");
                  }
                  navigate("/chat", { replace: true });
                  setIsDissolveConfirmOpen(false);
                  setActiveSpaceId(null);
                },
              });
            }}
          />

          <ConfirmModal
            isOpen={isTransferOwnerConfirmOpen}
            onClose={() => setIsTransferOwnerConfirmOpen(false)}
            title="确认转让空间"
            message="是否确定转让空间给该用户？此操作不可逆。转让后会关闭设置窗口并自动保存数据"
            onConfirm={() => {
              transferLeader.mutate({ spaceId, newLeaderId: transfereeId });
              handleClose();
            }}
          />
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
