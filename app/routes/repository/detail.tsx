// import { DEFAULT_REPOSITORY_DATA } from "@/components/repository/detail/constants";

import RepositoryDetailComponent from "@/components/repository/detail/repositoryDetail";
// import { useLocation } from "react-router";

export function meta() {
  return [
    { title: "仓库详情" },
    { name: "description", content: "View detailed information about this repository" },
  ];
}

export default function RepositoryDetail() {
  // const location = useLocation();

  // 优先使用从路由状态传递的数据，如果没有则使用默认数据
  // const passedData = location.state?.repositoryData;
  // const data = passedData || DEFAULT_REPOSITORY_DATA;

  return <RepositoryDetailComponent />;
}
