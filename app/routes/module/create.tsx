import type { Route } from "../+types/home";
import ModuleCreate2 from "@/components/module/create/ModuleCreate2";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "创建模组物品" },
    { name: "description", content: "Create your own module items here" },
  ];
}

export default function ModuleCreate() {
  return (
    <div className="bg-base-100 overflow-auto">
      {/* 这里添加创建模组的表单 */}
      <ModuleCreate2 />
    </div>
  );
}

// export default function ModuleCreate() {
//   return (
//     <div className="bg-base-100">
//       <div className="mx-auto max-w-[1280px] px-4 py-[10px]">
//         <h1 className="text-2xl font-bold mb-4">创建模组</h1>
//         {/* 这里添加创建模组的表单 */}
//         <ModuleForm />
//       </div>
//     </div>
//   );
// }
