import ModuleCreateMain from "@/components/module/create/ModuleCreateMain";

export function meta(_args: any) {
  return [
    { title: "创建模组" },
    { name: "description", content: "Create your own module here" },
  ];
}

export default function ModuleCreate() {
  return (
    <div className="bg-base-100 overflow-auto">
      {/* 这里添加创建模组的表单 */}
      <ModuleCreateMain />
    </div>
  );
}
