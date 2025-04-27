import type { Route } from "./+types/home";
import ModuleForm from "@/components/module/create/moduleCreate";
import RuleForm from "@/components/module/create/ruleCreate";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "创建模组物品" },
    { name: "description", content: "Create your own module items here" },
  ];
}

export default function ModuleCreate() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] bg-base-100 overflow-x-hidden">
      <div className="mx-auto max-w-[1280px] px-4 py-[10px]">
        <h1 className="text-2xl font-bold mb-4">创建模组</h1>
        {/* 这里添加创建模组的表单 */}
        <ModuleForm />
        <div className="divider">
          <span className="text-2xl font-bold">可选</span>
        </div>
        <div className="collapse bg-base-200">
          <input type="checkbox" />
          <div className="collapse-title font-semibold flex justify-center items-center p-0">创建或选择规则</div>
          <div className="collapse-content">
            <RuleForm />
          </div>
        </div>
      </div>
    </div>
  );
}
