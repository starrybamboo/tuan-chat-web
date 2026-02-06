import RepositoryCreateMain from "@/components/repository/create/RepositoryCreateMain";

export function meta(_args: any) {
  return [
    { title: "创建仓库" },
    { name: "description", content: "Create your own repository here" },
  ];
}

export default function RepositoryCreate() {
  return (
    <div className="bg-base-100 overflow-auto">
      {/* 这里添加创建仓库的表单 */}
      <RepositoryCreateMain />
    </div>
  );
}
