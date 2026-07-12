import { use, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";
import { AnimatePresence, motion } from "motion/react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { Button } from "@/components/common/Button";
import { FieldGroup, TextInput } from "@/components/common/FormField";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { ImeAwareSearchInput, useImeSearchValue } from "@/components/common/imeAwareSearchInput";
import { structuralListItemMotionProps } from "@/components/common/motion/listItemMotion";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { Tabs } from "@/components/common/Tabs";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { AddRingLight } from "@/icons";

import { useAddRoomRoleMutation, useGetRoomNpcRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetUserRolesQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";
import CreateNpcRoleWindow from "./createNpcRoleWindow";
import CreateRoleWindow from "./createRoleWindow";

const ROLE_CARD_CLASS_NAME = surfaceClassName({
  level: "content",
  className: "cursor-pointer shadow transition-shadow hover:shadow-lg",
});

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

  const userId = useGlobalUserId();
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  const addRoomRoleMutation = useAddRoomRoleMutation();

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "space">("my");
  const { committedValue: searchKeyword, inputProps: searchInputProps } = useImeSearchValue();
  const [forceRoleIdInput, setForceRoleIdInput] = useState("");

  const availableRoles = useMemo(() => {
    return userRoles.filter(role => role.type !== 2 && !roleIdInRoomSet.has(role.roleId));
  }, [roleIdInRoomSet, userRoles]);

  const normalizedSearch = useMemo(() => searchKeyword.trim().toLowerCase(), [searchKeyword]);
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
      appToast.error("请输入有效的角色ID");
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

      <Tabs
        value={activeTab}
        options={[
          { value: "my", label: "我的角色" },
          { value: "space", label: "空间角色" },
        ]}
        onValueChange={setActiveTab}
        ariaLabel="角色来源"
        className="mx-auto mb-4 w-fit"
      />

      <div className="bg-base-100 rounded-md p-6">
        <FieldGroup className="mb-4">
          <ImeAwareSearchInput
            type="text"
            autoComplete="off"
            className="w-full"
            placeholder={activeTab === "my" ? "搜索我的角色（名称/ID）" : "搜索空间角色（名称/ID）"}
            aria-label={activeTab === "my" ? "搜索我的角色" : "搜索空间角色"}
            {...searchInputProps}
          />
        </FieldGroup>
        {activeTab === "space" && (
          <div className="
            mb-4 rounded-lg border border-base-300 p-3 bg-base-200/30
          ">
            <div className="text-sm font-semibold text-base-content/80 mb-2">开发调试：按ID强制添加</div>
            <div className="flex items-center gap-2">
              <TextInput
                density="compact"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="w-full"
                placeholder={isRoomScope ? "输入角色ID，强制加入当前房间" : "输入角色ID，强制加入当前空间库"}
                aria-label="按角色ID强制添加"
                value={forceRoleIdInput}
                onChange={(event) => {
                  setForceRoleIdInput(event.currentTarget.value.replace(/\D/g, ""));
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing)
                    return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleForceAddRoleById();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="border-info/45 text-info hover:border-info/70 hover:bg-info/10"
                onClick={handleForceAddRoleById}
                disabled={!canForceAddRole}
              >
                强制添加
              </Button>
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
                    <div className="
                      text-sm font-semibold text-base-content/70 mb-2
                    ">搜索结果</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <AnimatePresence initial={false} mode="popLayout">
                        {filteredAvailableRoles.map((role, index) => (
                          <motion.div
                            className={ROLE_CARD_CLASS_NAME}
                            key={`search-${role.roleId}`}
                            {...structuralListItemMotionProps({
                              index,
                              staggerDelay: 0.01,
                              maxDelay: 0.08,
                            })}
                          >
                          <div className="flex flex-col items-center p-3">
                            <button
                              type="button"
                              aria-label={`添加角色 ${role.roleName}`}
                              onClick={() => handleAddRole(role.roleId)}
                            >
                              <RoleAvatarByRole
                                role={role}
                                width={24}
                                isRounded={true}
                                withTitle={false}
                                stopToastWindow={true}
                              />
                            </button>
                            <p className="text-center block">{role.roleName}</p>
                          </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                {availableRoles.length === 0 && (
                  <div className="text-center font-bold py-5">你已经没有角色可以导入了哦</div>
                )}
                <div className="flex flex-wrap gap-3 justify-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {availableRoles.map((role, index) => (
                      <motion.div
                        className={ROLE_CARD_CLASS_NAME}
                        key={role.roleId}
                        {...structuralListItemMotionProps({
                          index,
                          staggerDelay: 0.01,
                          maxDelay: 0.08,
                        })}
                      >
                      <div className="flex flex-col items-center p-3">
                        <button
                          type="button"
                          aria-label={`添加角色 ${role.roleName}`}
                          onClick={() => handleAddRole(role.roleId)}
                        >
                          <RoleAvatarByRole
                            role={role}
                            width={24}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                          />
                        </button>
                        <p className="text-center block">{role.roleName}</p>
                      </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button
                    type="button"
                    className={ROLE_CARD_CLASS_NAME}
                    onClick={() => setIsCreatingRole(true)}
                  >
                    <div className="flex flex-col items-center p-3">
                      <AddRingLight className="size-24 jump_icon" />
                      <p className="text-center block">创建角色</p>
                      <p className="text-center block text-xs text-base-content/60">
                        {isRoomScope ? "创建并加入当前房间" : "创建并加入当前空间"}
                      </p>
                    </div>
                  </button>
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
                    <div className="
                      text-sm font-semibold text-base-content/70 mb-2
                    ">搜索结果</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <AnimatePresence initial={false} mode="popLayout">
                        {filteredAvailableSpaceRoles.map((role, index) => (
                          <motion.div
                            className={ROLE_CARD_CLASS_NAME}
                            key={`search-${role.roleId}`}
                            {...structuralListItemMotionProps({
                              index,
                              staggerDelay: 0.01,
                              maxDelay: 0.08,
                            })}
                          >
                          <div className="flex flex-col items-center p-3">
                            <button
                              type="button"
                              aria-label={`导入空间角色 ${role.roleName}`}
                              onClick={() => handleImportSpaceRole(role.roleId)}
                            >
                              <RoleAvatarByRole
                                role={role}
                                width={24}
                                isRounded={true}
                                withTitle={false}
                                stopToastWindow={true}
                              />
                            </button>
                            <p className="text-center block">{role.roleName}</p>
                          </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                {availableSpaceRoles.length === 0 && (
                  <div className="text-center font-bold py-5">暂无空间角色可导入</div>
                )}
                <div className="flex flex-wrap gap-3 justify-center">
                  <AnimatePresence initial={false} mode="popLayout">
                    {availableSpaceRoles.map((role, index) => (
                      <motion.div
                        className={ROLE_CARD_CLASS_NAME}
                        key={role.roleId}
                        {...structuralListItemMotionProps({
                          index,
                          staggerDelay: 0.01,
                          maxDelay: 0.08,
                        })}
                      >
                      <div className="flex flex-col items-center p-3">
                        <button
                          type="button"
                          aria-label={`导入空间角色 ${role.roleName}`}
                          onClick={() => handleImportSpaceRole(role.roleId)}
                        >
                          <RoleAvatarByRole
                            role={role}
                            width={24}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                          />
                        </button>
                        <p className="text-center block">{role.roleName}</p>
                      </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button
                    type="button"
                    className={ROLE_CARD_CLASS_NAME}
                    onClick={() => setIsCreatingNpc(true)}
                  >
                    <div className="flex flex-col items-center p-3">
                      <AddRingLight className="size-24 jump_icon" />
                      <p className="text-center block">创建NPC</p>
                      <p className="text-center block text-xs text-base-content/60">
                        {isRoomScope ? "创建并加入当前房间" : "创建并加入当前空间"}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
      </div>
    </div>
  );
}
