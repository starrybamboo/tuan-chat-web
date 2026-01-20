import React, { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useAddRoomRoleMutation, useAddSpaceRoleMutation, useGetRoomModuleRoleQuery, useGetRoomRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useCreateRoleMutation } from "../../../../api/hooks/RoleAndAvatarHooks";
import { useGetSpaceModuleRoleQuery } from "../../../../api/hooks/spaceModuleHooks";

export default function CreateNpcRoleWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createRoleMutation = useCreateRoleMutation();
  const addSpaceRoleMutation = useAddSpaceRoleMutation();
  const addRoomRoleMutation = useAddRoomRoleMutation();

  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomNpcRolesQuery = useGetRoomModuleRoleQuery(roomId);
  const roomRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceNpcRolesQuery = useGetSpaceModuleRoleQuery(spaceId);
  const spaceNpcRoles = useMemo(() => spaceNpcRolesQuery.data?.data ?? [], [spaceNpcRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>([...roomRoles, ...roomNpcRoles].map(r => r.roleId));
  }, [roomNpcRoles, roomRoles]);

  const importableSpaceNpcRoles = useMemo(() => {
    return spaceNpcRoles.filter(r => !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceNpcRoles]);

  const handleCreateNpc = async () => {
    const trimmedName = roleName.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName) {
      toast.error("请输入NPC名字");
      return;
    }
    if (spaceId <= 0 || roomId <= 0) {
      toast.error("空间/房间信息异常，无法创建NPC");
      return;
    }
    if (isCreating) {
      toast.error("正在创建中，请稍等");
      return;
    }

    setIsCreating(true);
    try {
      const newRoleId = await createRoleMutation.mutateAsync({
        roleName: trimmedName,
        description: trimmedDesc,
        type: 0,
      });

      if (!newRoleId || newRoleId <= 0) {
        throw new Error("创建角色失败");
      }

      await addSpaceRoleMutation.mutateAsync({
        spaceId,
        roleId: newRoleId,
      });

      await addRoomRoleMutation.mutateAsync({
        roomId,
        roleIdList: [newRoleId],
        type: 1,
      });

      toast.success("NPC创建成功");
      onClose();
    }
    catch (e: any) {
      console.error("创建NPC失败", e);
      toast.error(e?.message ? `创建NPC失败：${e.message}` : "创建NPC失败");
    }
    finally {
      setIsCreating(false);
    }
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
        type: 1,
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
      <p className="text-lg font-bold text-center w-full mb-4">创建NPC</p>

      <div className="bg-base-100 rounded-box p-6 space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold">快速创建</div>
          <input
            className="input input-bordered w-full"
            placeholder="NPC名字（必填）"
            value={roleName}
            onChange={e => setRoleName(e.target.value)}
            disabled={isCreating}
          />
          <textarea
            className="textarea textarea-bordered w-full min-h-20"
            placeholder="NPC简介（可选）"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={isCreating}
          />
          <button
            type="button"
            className={`btn btn-sm ${isCreating ? "btn-disabled" : "btn-info"}`}
            onClick={handleCreateNpc}
            disabled={isCreating}
          >
            创建并加入房间
          </button>
        </div>

        <div className="divider">或从NPC库导入</div>

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
    </div>
  );
}
