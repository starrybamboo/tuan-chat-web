import RoleAvatarComponent from "@/components/common/roleAvatar";
import { useModuleRolesQuery } from "api/hooks/moduleQueryHooks";
import { useContext } from "react";
import WorkspaceContext from "../context/module";

function Section({ label, children }: { label: string; children?: React.ReactNode | React.ReactNode[] }) {
  return (
    <div className="collapse collapse-arrow bg-base-100 border-base-300 border rounded-none">
      <input type="checkbox" />
      <div className="collapse-title font-semibold">{label}</div>
      <div className="collapse-content p-0 text-sm flex flex-col">
        {children}
      </div>
    </div>
  );
}

// 角色表单项
function RoleListItem({ avatarId, name }: { avatarId: number; name: string }) {
  return (
    <div className="w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer">
      <RoleAvatarComponent avatarId={avatarId} width={10} withTitle={false} isRounded={true} stopPopWindow={true} />
      <p className="self-baseline">{name}</p>
    </div>
  );
}

function RoleList() {
  const ctx = useContext(WorkspaceContext);
  const { data, isSuccess: _isSuccess } = useModuleRolesQuery({
    pageNo: 1,
    pageSize: 100,
    moduleId: ctx.moduleId,
  });
  const list = data?.data!.list!.map(i => i.roleResponse);

  return (
    <Section label="角色">
      {
        list?.map(i => <RoleListItem key={i!.roleId} avatarId={i!.avatarId} name={i!.roleName} />)
      }
    </Section>
  );
}

const sections = ["角色", "物品", "场景"];
function ModuleItems() {
  return (
    <div className="w-full h-full">
      <RoleList />
      {
        sections.slice(1).map((i) => {
          return (
            <Section key={i} label={i}></Section>
          );
        })
      }
    </div>
  );
}

export default ModuleItems;
