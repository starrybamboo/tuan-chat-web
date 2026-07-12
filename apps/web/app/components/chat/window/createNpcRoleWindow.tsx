import { useQueryClient } from "@tanstack/react-query";
import { use, useMemo, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { CharacterData } from "@/components/Role/RoleCreation/types";
import type { Role } from "@/components/Role/types";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { Tabs } from "@/components/common/Tabs";
import RoleCreationFlow from "@/components/Role/RoleCreation/RoleCreationFlow";

import { useAddRoomRoleMutation, useGetRoomNpcRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";

const IMPORT_ROLE_CARD_CLASS_NAME = surfaceClassName({
  level: "content",
  className: "cursor-pointer shadow transition-shadow hover:shadow-lg",
});

export default function CreateNpcRoleWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const ruleId = spaceContext.ruleId ?? 0;

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const addRoomRoleMutation = useAddRoomRoleMutation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"create" | "import">("create");

  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceNpcRolesQuery = useGetSpaceRepositoryRoleQuery(spaceId);
  const spaceNpcRoles = useMemo(() => spaceNpcRolesQuery.data?.data ?? [], [spaceNpcRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>([...roomRoles, ...roomNpcRoles].map(r => r.roleId));
  }, [roomNpcRoles, roomRoles]);

  const importableSpaceNpcRoles = useMemo(() => {
    return spaceNpcRoles.filter(r => r.type === 2 && !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceNpcRoles]);

  const initialCharacterData = useMemo<CharacterData>(() => {
    return {
      name: "",
      description: "",
      avatar: "",
      ruleId: ruleId > 0 ? ruleId : 0,
      act: {},
      basic: {},
      ability: {},
      skill: {},
    };
  }, [ruleId]);

  const handleCreateNpcComplete = (_createdRole: Role) => {
    void queryClient.invalidateQueries({ queryKey: ["spaceRole", spaceId] });
    appToast.success("NPC创建成功");
    onClose();
  };

  const handleImportNpcToRoom = async (roleId: number) => {
    if (spaceId <= 0 || roomId <= 0) {
      appToast.error("空间/房间信息异常，无法添加NPC");
      return;
    }
    try {
      await addRoomRoleMutation.mutateAsync({
        roomId,
        roleIdList: [roleId],
      });
      appToast.success("添加NPC成功");
      onClose();
    }
    catch (e: any) {
      console.error("添加NPC失败", e);
      appToast.error(e?.message ? `添加NPC失败：${e.message}` : "添加NPC失败");
    }
  };

  return (
    <div className="justify-center w-full">
      <Tabs
        value={activeTab}
        options={[
          { value: "create", label: "创建NPC" },
          { value: "import", label: "从NPC库导入" },
        ]}
        onValueChange={setActiveTab}
        ariaLabel="NPC 创建方式"
        className="mb-3 flex w-full [&_[role=tab]]:flex-1"
      />

      {activeTab === "create" && (
        <div className="
          bg-base-100 rounded-md p-2
          sm:p-4
        ">
          <RoleCreationFlow
            title="创建NPC"
            description="填写NPC信息，完成创建"
            onBack={onClose}
            onComplete={handleCreateNpcComplete}
            roleCreateDefaults={{ type: 2, spaceId: spaceId > 0 ? spaceId : undefined }}
            initialCharacterData={initialCharacterData}
            hideRuleSelection={ruleId > 0}
          />
        </div>
      )}

      {activeTab === "import" && (
        <div className="bg-base-100 rounded-md p-6 space-y-4">
          {importableSpaceNpcRoles.length === 0 && (
            <div className="text-center py-2">
              <div className="font-bold">无可导入NPC</div>
              <div className="mt-1 text-sm text-base-content/60">先创建 NPC，或检查当前空间角色权限。</div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            {importableSpaceNpcRoles.map(role => (
              <div className={IMPORT_ROLE_CARD_CLASS_NAME} key={role.roleId}>
                <div className="flex flex-col items-center p-3">
                  <button
                    type="button"
                    aria-label={`导入 NPC ${role.roleName}`}
                    onClick={() => handleImportNpcToRoom(role.roleId)}
                  >
                    <RoleAvatarByRole
                      role={role}
                      width={24}
                      isRounded={true}
                      withTitle={false}
                      stopToastWindow={true}
                    />
                    <p className="text-center block" title={role.roleName}>{role.roleName}</p>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
