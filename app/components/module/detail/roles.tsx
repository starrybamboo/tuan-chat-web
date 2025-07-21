import RoleAvatarComponent from "@/components/common/roleAvatar";
import {
  useModuleRoleInfoQuery,
  useModuleRolesQuery,
} from "api/hooks/moduleAndStageQueryHooks";
import { useGetRoleAvatarQuery } from "api/queryHooks";
import { useCallback, useState } from "react";

function RoleAvatar(
  { roleId, avatarId, onChange }: {
    roleId: number;
    avatarId: number;
    onChange?: (roleId: number) => void;
  },
) {
  const handleSelectRole = useCallback(() => {
    if (onChange) {
      onChange(roleId);
    }
  }, [onChange, roleId]);

  return (
    <div className="avatar h-16">
      <div
        className="w-16 h-16 rounded-full border-1 border-primary cursor-pointer"
        onMouseEnter={handleSelectRole}
        onClick={handleSelectRole}
      >
        <RoleAvatarComponent
          avatarId={avatarId}
          width={16}
          isRounded={true}
          withTitle={false}
          stopPopWindow={true}
        />
      </div>
    </div>
  );
}

function RoleDetail(
  { moduleId, roleId }: { moduleId: number; roleId: number },
) {
  const { data: roleData, isPending: isRolePending } = useModuleRoleInfoQuery(
    moduleId,
    roleId,
  );
  const avatarId = roleData?.data?.roleResponse?.avatarId;
  const { data: avatarData, isPending: isAvatarPending }
    = useGetRoleAvatarQuery(avatarId!);

  if (!roleId) {
    return (
      <div className="flex h-full w-full items-center justify-center text-base-content/50">
        请选择一个角色
      </div>
    );
  }

  const roleInfo = roleData?.data?.roleResponse;

  return (
    (!isRolePending && !isAvatarPending)
      ? (
          <div className="h-full w-full flex gap-2">
            {/* 立绘部分 */}
            <div className="w-full min-h-96 flex-grow relative">
              <img
                src={avatarData!.data!.spriteUrl}
                className="h-full w-full object-contain"
                alt={roleInfo?.roleName}
              />
            </div>

            {/* 角色信息部分 */}
            <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-lg">
              {/* 角色名称和基本信息 */}
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">{roleInfo?.roleName}</h2>
                <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                  ID:
                  {" "}
                  {roleInfo?.roleId}
                </span>
              </div>

              {/* 角色描述 */}
              <div className="text-base-content/80">
                <p className="whitespace-pre-wrap">{roleInfo?.description}</p>
              </div>

              {/* TTS 相关信息 */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-base-content/60">语音模型</span>
                  <span className="font-mono">
                    {roleInfo?.modelName || "未设置"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-base-content/60">说话人</span>
                  <span className="font-mono">
                    {roleInfo?.speakerName || "未设置"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      : null
  );
}

function Roles({ moduleId }: { moduleId: number }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { data: allRoles, isLoading: _allRolesLoading } = useModuleRolesQuery({
    moduleId,
    pageNo: 1,
    pageSize: 100,
  });

  const setRoleId = useCallback((roleId: number) => {
    setSelectedRoleId(roleId);
  }, []);

  return (
    <div className="flex w-full min-h-128 bg-base-200">
      <div className="basis-92 shrink-0 flex flex-wrap p-2 gap-2 h-fit">
        {allRoles
          ? allRoles.data!.list!.map((i) => {
              const roleId = i.roleResponse!.roleId;
              const avatarId = i.roleResponse!.avatarId;
              return (
                <RoleAvatar
                  key={i.roleResponse?.roleId}
                  roleId={roleId!}
                  avatarId={avatarId!}
                  onChange={setRoleId}
                />
              );
            })
          : <div>没有数据</div>}
      </div>
      <div className="grow p-2 border-l-2 border-base-content/10 border-solid">
        <RoleDetail roleId={selectedRoleId!} moduleId={moduleId} />
      </div>
    </div>
  );
}

export default Roles;
