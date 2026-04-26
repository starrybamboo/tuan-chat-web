import type { Route } from "./+types/detail";
// import { DEFAULT_REPOSITORY_DATA } from "@/components/repository/detail/constants";

import { tuanchat } from "api/instance";
import RepositoryDetailComponent from "@/components/repository/detail/repositoryDetail";
import { createSeoMeta } from "@/utils/seo";
// import { useLocation } from "react-router";

interface RepositorySeoData {
  repositoryName?: string | null;
  description?: string | null;
  authorName?: string | null;
  image?: string | null;
}

function buildRepositorySeoDescription(repository: RepositorySeoData | null | undefined, repositoryId?: string) {
  const repositoryDescription = repository?.description?.trim();
  if (repositoryDescription) {
    return repositoryDescription;
  }

  const repositoryName = repository?.repositoryName?.trim() || (repositoryId ? `模组 #${repositoryId}` : "当前模组");
  const authorName = repository?.authorName?.trim();
  return `${repositoryName}${authorName ? `，作者 ${authorName}` : ""}。在团剧共创查看模组介绍、设定与可 Fork 内容。`;
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const repositoryId = Number(params.id);
  if (!Number.isFinite(repositoryId) || repositoryId <= 0) {
    return null;
  }

  try {
    const response = await tuanchat.repositoryController.getById(repositoryId);
    return response.data ?? null;
  }
  catch {
    return null;
  }
}

export function meta({ data, params }: Route.MetaArgs) {
  const repositoryName = data?.repositoryName?.trim() || (params.id ? `模组 #${params.id}` : "模组详情");
  const repositoryImage = typeof data?.image === "string" ? data.image.trim() : "";

  return createSeoMeta({
    title: repositoryName,
    description: buildRepositorySeoDescription(data, params.id),
    path: params.id ? `/repository/detail/${params.id}` : "/repository/detail",
    index: true,
    image: repositoryImage || undefined,
  });
}

export default function RepositoryDetail() {
  // const location = useLocation();

  // 优先使用从路由状态传递的数据，如果没有则使用默认数据
  // const passedData = location.state?.repositoryData;
  // const data = passedData || DEFAULT_REPOSITORY_DATA;

  return <RepositoryDetailComponent />;
}
