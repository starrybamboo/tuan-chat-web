import type { CharacterData } from "@/components/Role/RoleCreation/types";
import type { Role } from "@/components/Role/types";
import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import RoleCreationFlow from "@/components/Role/RoleCreation/RoleCreationFlow";
import { useAddRoomRoleMutation, useGetRoomNpcRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";

export default function CreateNpcRoleWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;
  const ruleId = spaceContext.ruleId ?? 0;

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const addRoomRoleMutation = useAddRoomRoleMutation();
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
    return spaceNpcRoles.filter(r => !roleIdInRoomSet.has(r.roleId));
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

  const handleCreateNpcComplete = (createdRole: Role) => {
    void (async () => {
      if (spaceId <= 0 || roomId <= 0) {
        toast.error("空间/房间信息异常，无法创建NPC");
        return;
      }
      try {
        await addRoomRoleMutation.mutateAsync({
          roomId,
          roleIdList: [createdRole.id],
        });
        toast.success("NPC创建成功");
        onClose();
      }
      catch (e: any) {
        console.error("添加NPC到房间失败", e);
        toast.error(e?.message ? `添加NPC到房间失败：${e.message}` : "添加NPC到房间失败");
      }
    })();
  };

  const handleImportNpcToRoom = async (roleId: number) => {
    if (spaceId <= 0 || roomId <= 0) {
      toast.error("空间/房间信息异常，无法添加NPC");
      return;
    }
    try {
      await addRoomRoleMutation.mutateAsync({
        roomId,
        roleIdList: [roleId],
      });
      toast.success("添加NPC成功");
      onClose();
    }
    catch (e: any) {
      console.error("添加NPC失败", e);
      toast.error(e?.message ? `添加NPC失败：${e.message}` : "添加NPC失败");
    }
  };

  return (
    <div className="justify-center w-full">
      <div className="tabs tabs-boxed w-full mb-3">
        <button
          type="button"
          className={`tab flex-1 ${activeTab === "create" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          创建NPC
        </button>
        <button
          type="button"
          className={`tab flex-1 ${activeTab === "import" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          从NPC库导入
        </button>
      </div>

      {activeTab === "create" && (
        <div className="bg-base-100 rounded-box p-2 sm:p-4">
          <RoleCreationFlow
            title="创建NPC"
            description="填写NPC信息，完成创建并加入当前房间"
            onBack={onClose}
            onComplete={handleCreateNpcComplete}
            roleCreateDefaults={{ type: 2, spaceId: spaceId > 0 ? spaceId : undefined }}
            initialCharacterData={initialCharacterData}
            hideRuleSelection={ruleId > 0}
          />
        </div>
      )}

      {activeTab === "import" && (
        <div className="bg-base-100 rounded-box p-6 space-y-4">
          {importableSpaceNpcRoles.length === 0 && (
            <div className="text-center font-bold py-2">无可导入NPC</div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            {importableSpaceNpcRoles.map(role => (
              <div className="card shadow hover:shadow-lg transition-shadow cursor-pointer" key={role.roleId}>
                <div className="flex flex-col items-center p-3">
                  <div onClick={() => handleImportNpcToRoom(role.roleId)}>
                    <RoleAvatarComponent
                      avatarId={role.avatarId ?? -1}
                      roleId={role.roleId}
                      width={24}
                      isRounded={true}
                      withTitle={false}
                      stopPopWindow={true}
                    />
                  </div>
                  <p className="text-center block">{role.roleName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
