import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useModuleRoleInfoQuery, useModuleRolesQuery } from "api/hooks/moduleQueryHooks";
import { useGetRoleAvatarQuery } from "api/queryHooks";
import { useCallback, useState } from "react";

function RoleAvatar({ roleId, avatarId, onChange }: { roleId: number; avatarId: number; onChange?: (roleId: number) => void }) {
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
        <RoleAvatarComponent avatarId={avatarId} width={16} isRounded={true} withTitle={false} stopPopWindow={true} />
      </div>
    </div>
  );
}

function RoleDetail({ moduleId, roleId }: { moduleId: number; roleId: number }) {
  const { data: roleData } = useModuleRoleInfoQuery(moduleId, roleId);
  const avatarId = roleData?.data?.roleResponse?.avatarId;
  const { data: avatarData } = useGetRoleAvatarQuery(avatarId!);

  return (
    <div className="h-full w-full">
      <img src={avatarData?.data?.spriteUrl} className=" h-full"></img>
    </div>
  );
}

function Roles({ moduleId }: { moduleId: number }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const { data: allRoles, isLoading: _allRolesLoading } = useModuleRolesQuery({ moduleId, pageNo: 1, pageSize: 100 });

  const setRoleId = useCallback((roleId: number) => {
    setSelectedRoleId(roleId);
  }, []);

  return (
    <div className="flex w-full min-h-128 bg-base-200">
      <div className="basis-92 flex flex-wrap p-2 gap-2 h-fit">
        {
          allRoles
            ? allRoles.data!.list!.map((i) => {
                const roleId = i.roleResponse!.roleId;
                const avatarId = i.roleResponse!.avatarId;
                return <RoleAvatar key={i.roleResponse?.roleId} roleId={roleId!} avatarId={avatarId!} onChange={setRoleId} />;
              })
            : <div> 没有数据 </div>
        }
      </div>
      <div className="basis-1/3 p-2 border-l-2 border-base-content/10 border-solid">
        <RoleDetail roleId={selectedRoleId!} moduleId={moduleId} />
      </div>
    </div>
  );
}

export default Roles;
