import React, { use, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";
import { useAddRoomRoleMutation, useGetRoomNpcRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";
import CreateNpcRoleWindow from "./createNpcRoleWindow";
import CreateRoleWindow from "./createRoleWindow";

export function AddRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId;

  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const roomRolesQuery = useGetRoomRoleQuery(roomId ?? -1);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);

  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(roomId ?? -1);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceRolesQuery = useGetSpaceRepositoryRoleQuery(spaceId);
  const spaceRoles = useMemo(() => spaceRolesQuery.data?.data ?? [], [spaceRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>([...roomRoles, ...roomNpcRoles].map(r => r.roleId));
  }, [roomNpcRoles, roomRoles]);

  // Filter space roles that are already in the room?
  // roomRoles contains roleId.
  // We should maybe filter out space roles that are already in the roomRoles list?
  // Common behavior for import windows.
  // roomRoles might be players or NPCs.
  const availableSpaceRoles = useMemo(() => {
    return spaceRoles.filter(r => !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceRoles]);

  const userId = useGlobalContext().userId;
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  const addRoomRoleMutation = useAddRoomRoleMutation();

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "space">("my");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [forceRoleIdInput, setForceRoleIdInput] = useState("");

  const availableRoles = useMemo(() => {
    return userRoles.filter(role => role.type !== 2 && !roleIdInRoomSet.has(role.roleId));
  }, [roleIdInRoomSet, userRoles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [searchKeyword]);

  const normalizedSearch = useMemo(() => debouncedKeyword.trim().toLowerCase(), [debouncedKeyword]);
  const hasSearch = normalizedSearch.length > 0;

  const filteredAvailableRoles = useMemo(() => {
    if (!normalizedSearch)
      return availableRoles;
    return availableRoles.filter((role) => {
      const roleName = role.roleName ?? "";
      return roleName.toLowerCase().includes(normalizedSearch) || String(role.roleId).includes(normalizedSearch);
    });
  }, [availableRoles, normalizedSearch]);

  const filteredAvailableSpaceRoles = useMemo(() => {
    if (!normalizedSearch)
      return availableSpaceRoles;
    return availableSpaceRoles.filter((role) => {
      const roleName = role.roleName ?? "";
      return roleName.toLowerCase().includes(normalizedSearch) || String(role.roleId).includes(normalizedSearch);
    });
  }, [availableSpaceRoles, normalizedSearch]);

  if (isCreatingRole) {
    return <CreateRoleWindow onClose={() => setIsCreatingRole(false)} />;
  }

  if (isCreatingNpc) {
    return <CreateNpcRoleWindow onClose={() => setIsCreatingNpc(false)} />;
  }

  const isRoomScope = (roomId ?? -1) > 0;

  const handleImportSpaceRole = (roleId: number) => {
    if (isRoomScope) {
      addRoomRoleMutation.mutate({ roomId: roomId ?? -1, roleIdList: [roleId] });
      return;
    }
    handleAddRole(roleId);
  };

  const forceRoleId = Number.parseInt(forceRoleIdInput, 10);
  const canForceAddRole = Number.isFinite(forceRoleId) && forceRoleId > 0;
  const handleForceAddRoleById = () => {
    if (!canForceAddRole) {
      toast.error("请输入有效的角色ID");
      return;
    }
    if (isRoomScope) {
      addRoomRoleMutation.mutate({ roomId: roomId ?? -1, roleIdList: [forceRoleId] });
    }
    else {
      handleAddRole(forceRoleId);
    }
    setForceRoleIdInput("");
  };

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入角色
      </p>

      <div role="tablist" className="tabs tabs-boxed mb-4 mx-auto w-fit">
        <a
          role="tab"
          className={`tab ${activeTab === "my" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("my")}
        >
          我的角色
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === "space" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("space")}
        >
          空间角色
        </a>
      </div>

      <div className="bg-base-100 rounded-box p-6">
        <div className="form-control mb-4">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder={activeTab === "my" ? "搜索我的角色（名称/ID）" : "搜索空间角色（名称/ID）"}
            aria-label={activeTab === "my" ? "搜索我的角色" : "搜索空间角色"}
            value={searchKeyword}
            onChange={(e) => {
              setSearchKeyword(e.currentTarget.value);
            }}
          />
        </div>
        {activeTab === "space" && (
          <div className="mb-4 rounded-lg border border-base-300 p-3 bg-base-200/30">
            <div className="text-sm font-semibold text-base-content/80 mb-2">开发调试：按ID强制添加</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                placeholder={isRoomScope ? "输入角色ID，强制加入当前房间" : "输入角色ID，强制加入当前空间库"}
                aria-label="按角色ID强制添加"
                value={forceRoleIdInput}
                onChange={(event) => {
                  setForceRoleIdInput(event.currentTarget.value.replace(/\D/g, ""));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleForceAddRoleById();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-info"
                onClick={handleForceAddRoleById}
                disabled={!canForceAddRole}
              >
                强制添加
              </button>
            </div>
            <div className="text-xs text-base-content/60 mt-1">
              跳过当前列表过滤，直接按角色ID添加。
            </div>
          </div>
        )}
        {activeTab === "my"
          ? (
              <>
                {
                  hasSearch && filteredAvailableRoles.length === 0 && (
                    <div className="text-center font-bold py-5">
                      未找到匹配的角色
                    </div>
                  )
                }
                {hasSearch && filteredAvailableRoles.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-base-content/70 mb-2">搜索结果</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {filteredAvailableRoles.map(role => (
                        <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={`search-${role.roleId}`}>
                          <div className="flex flex-col items-center p-3">
                            <div onClick={() => handleAddRole(role.roleId)}>
                              <RoleAvatarComponent
                                avatarId={role.avatarId ?? -1}
                                roleId={role.roleId}
                                width={24}
                                isRounded={true}
                                withTitle={false}
                                stopToastWindow={true}
                              />
                            </div>
                            <p className="text-center block">{role.roleName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {availableRoles.length === 0 && (
                  <div className="text-center font-bold py-5">你已经没有角色可以导入了哦</div>
                )}
                <div className="flex flex-wrap gap-3 justify-center">
                  {availableRoles.map(role => (
                    <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
                      <div className="flex flex-col items-center p-3">
                        <div onClick={() => handleAddRole(role.roleId)}>
                          <RoleAvatarComponent
                            avatarId={role.avatarId ?? -1}
                            roleId={role.roleId}
                            width={24}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                          />
                        </div>
                        <p className="text-center block">{role.roleName}</p>
                      </div>
                    </div>
                  ))}
                  <div
                    className="card shadow hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setIsCreatingRole(true)}
                  >
                    <div className="flex flex-col items-center p-3">
                      <AddRingLight className="size-24 jump_icon" />
                      <p className="text-center block">创建角色</p>
                    </div>
                  </div>
                </div>
              </>
            )
          : (
              <>
                {hasSearch && filteredAvailableSpaceRoles.length === 0 && (
                  <div className="text-center font-bold py-5">
                    未找到匹配的角色
                  </div>
                )}
                {hasSearch && filteredAvailableSpaceRoles.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-semibold text-base-content/70 mb-2">搜索结果</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {filteredAvailableSpaceRoles.map(role => (
                        <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={`search-${role.roleId}`}>
                          <div className="flex flex-col items-center p-3">
                            <div onClick={() => handleImportSpaceRole(role.roleId)}>
                              <RoleAvatarComponent
                                avatarId={role.avatarId ?? -1}
                                roleId={role.roleId}
                                width={24}
                                isRounded={true}
                                withTitle={false}
                                stopToastWindow={true}
                              />
                            </div>
                            <p className="text-center block">{role.roleName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {availableSpaceRoles.length === 0 && (
                  <div className="text-center font-bold py-5">暂无空间角色可导入</div>
                )}
                <div className="flex flex-wrap gap-3 justify-center">
                  {availableSpaceRoles.map(role => (
                    <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
                      <div className="flex flex-col items-center p-3">
                        <div onClick={() => handleImportSpaceRole(role.roleId)}>
                          <RoleAvatarComponent
                            avatarId={role.avatarId ?? -1}
                            roleId={role.roleId}
                            width={24}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                          />
                        </div>
                        <p className="text-center block">{role.roleName}</p>
                      </div>
                    </div>
                  ))}
                  <div
                    className="card shadow hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setIsCreatingNpc(true)}
                  >
                    <div className="flex flex-col items-center p-3">
                      <AddRingLight className="size-24 jump_icon" />
                      <p className="text-center block">创建NPC</p>
                    </div>
                  </div>
                </div>
              </>
            )}
      </div>
    </div>
  );
}
