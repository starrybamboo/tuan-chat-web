import type { Route } from "./+types/create";
import MainWork from "@/components/create/workPlace/MainWork";
import Work from "@/components/create/workPlace/work";
import { useParams } from "react-router";

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
  const { editingStageId } = useParams();
  return editingStageId ? <MainWork /> : <Work />;
}
