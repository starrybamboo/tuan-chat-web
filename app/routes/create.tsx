import type { Route } from "./+types/create";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "工作室" },
    {
      name: "description",
      content: "欢迎来到tuan chat工作室, 你可以在这里自由创建和修改模组!",
    },
  ];
}

export default function Create() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
      <h1 className="text-2xl font-semibold">工作室</h1>
      <div className="mt-4 text-base-content/70">
        创作相关页面已移除。
      </div>
    </div>
  );
}
