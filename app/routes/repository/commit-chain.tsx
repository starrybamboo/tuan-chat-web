import type { RouteMetaArgs } from "@/router/routeTypes";
import RepositoryCommitChainPage from "@/components/repository/commitChain/RepositoryCommitChainPage";
import { createSeoMeta } from "@/utils/seo";

export function meta(_args: RouteMetaArgs) {
  return createSeoMeta({
    title: "模组提交链",
    description: "查看团剧共创模组的提交链路与演进历史。",
    path: "/repository/commit-chain",
    index: false,
  });
}

export default function RepositoryCommitChainRoute() {
  return <RepositoryCommitChainPage />;
}
