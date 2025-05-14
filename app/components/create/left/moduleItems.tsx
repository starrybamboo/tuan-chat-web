import RoleAvatarComponent from "@/components/common/roleAvatar";
import { moduleType, useModuleContext } from "@/components/module/workPlace/ModuleContext";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleRolesQuery } from "api/hooks/moduleQueryHooks";
import { use } from "react";
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
function RoleListItem({ avatarId, name, onClick }: { avatarId: number; name: string; onClick: () => void }) {
  return (
    <div
      className="w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer"
      onClick={onClick}
    >
      <RoleAvatarComponent avatarId={avatarId} width={10} withTitle={false} isRounded={true} stopPopWindow={true} />
      <p className="self-baseline">{name}</p>
    </div>
  );
}

function RoleList() {
  const { setModulePartition, setSelectedRoleId } = useModuleContext();
  const queryClient = useQueryClient();
  const handleClick = (roleId: number) => {
    setSelectedRoleId(roleId);
    setModulePartition(moduleType.content.role);
    queryClient.invalidateQueries({
      queryKey: ["role", roleId],
    });
  };

  const ctx = use(WorkspaceContext);
  const { data, isSuccess: _isSuccess } = useModuleRolesQuery({
    pageNo: 1,
    pageSize: 100,
    moduleId: ctx.moduleId,
  });
  const list = data?.data!.list!.map(i => i.roleResponse);

  return (
    <Section label="角色">
      {
        list?.map(i => <RoleListItem key={i!.roleId} avatarId={i!.avatarId} name={i!.roleName} onClick={() => handleClick(i!.roleId)} />)
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

// // 可能用得上
// function ItemListItem({ id, name }: { id: number; name: string }) {
//   const { setModulePartition } = useModuleContext();

//   const handleClick = () => {
//     setModulePartition(moduleType.content.item);
//   };

//   return (
//     <div
//       className="w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer"
//       onClick={handleClick}
//     >
//       <p>{name}</p>
//     </div>
//   );
// }

// function SceneListItem({ id, name }: { id: number; name: string }) {
//   const { setModulePartition } = useModuleContext();

//   const handleClick = () => {
//     setModulePartition(moduleType.content.scene);
//   };

//   return (
//     <div
//       className="w-full h-12 p-2 flex gap-2 items-center hover:bg-base-200 cursor-pointer"
//       onClick={handleClick}
//     >
//       <p>{name}</p>
//     </div>
//   );
// }

export default ModuleItems;
