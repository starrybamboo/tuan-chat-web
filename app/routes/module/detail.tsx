// import { DEFAULT_MODULE_DATA } from "@/components/module/detail/constants";

import ModuleDetailComponent from "@/components/module/detail/moduleDetail";
// import { useLocation } from "react-router";

export function meta() {
  return [
    { title: "模组详情" },
    { name: "description", content: "View detailed information about this module" },
  ];
}

export default function ModuleDetail() {
  // const location = useLocation();

  // 优先使用从路由状态传递的数据，如果没有则使用默认数据
  // const passedData = location.state?.moduleData;
  // const data = passedData || DEFAULT_MODULE_DATA;

  return <ModuleDetailComponent />;
}
