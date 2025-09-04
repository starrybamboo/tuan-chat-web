import type { Route } from "./+types/create";
import Work from "@/components/module/workPlace/work";

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
    <Work />
  );
}
