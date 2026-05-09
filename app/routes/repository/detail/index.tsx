import type {
  RouteClientLoaderArgs,
  RouteMetaArgs,
} from "@/routes/routeTypes";
import { createFileRoute } from "@tanstack/react-router";
// import { DEFAULT_REPOSITORY_DATA } from "@/components/repository/detail/constants";

import { fetchRepositoryDetailWithCache } from "api/hooks/repositoryQueryHooks";
import RepositoryDetailComponent from "@/components/repository/detail/repositoryDetail";
import { queryClient } from "@/queryClient";
import { imageMediumUrl } from "@/utils/mediaUrl";
import { createSeoMeta } from "@/utils/seo";

interface RepositorySeoData {
  repositoryName?: string | null;
  description?: string | null;
  authorName?: string | null;
  image?: string | null;
  coverFileId?: number | null;
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

export async function clientLoader({ params }: RouteClientLoaderArgs) {
  const repositoryId = Number(params.id);
  if (!Number.isFinite(repositoryId) || repositoryId <= 0) {
    return null;
  }

  try {
    const response = await fetchRepositoryDetailWithCache(queryClient, repositoryId);
    return response.data ?? null;
  }
  catch {
    return null;
  }
}

export function meta({ data, params }: RouteMetaArgs<RepositorySeoData | null>) {
  const repositoryName = data?.repositoryName?.trim() || (params.id ? `模组 #${params.id}` : "模组详情");
  const repositoryImage = imageMediumUrl(data?.coverFileId) || (typeof data?.image === "string" ? data.image.trim() : "");

  return createSeoMeta({
    title: repositoryName,
    description: buildRepositorySeoDescription(data, params.id),
    path: params.id ? `/repository/detail/${params.id}` : "/repository/detail",
    index: true,
    image: repositoryImage || undefined,
  });
}

export const Route = createFileRoute("/_dashboard/repository/detail/{-$id}")({
  loader: ({ params }) => clientLoader({ params }),
  head: ({ loaderData, params }) => ({
    meta: meta({ data: loaderData, params }),
  }),
  component: RepositoryDetail,
});

export default function RepositoryDetail() {
  return <RepositoryDetailComponent />;
}
