import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiResultPageBaseRespMaterialPackageResponse } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespMaterialPackageResponse";
import type { ApiResultPageBaseRespSpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespSpaceMaterialPackageResponse";
import type { MaterialPackageCreateRequest } from "@tuanchat/openapi-client/models/MaterialPackageCreateRequest";
import type { MaterialPackagePageRequest } from "@tuanchat/openapi-client/models/MaterialPackagePageRequest";
import type { MaterialPackageUpdateRequest } from "@tuanchat/openapi-client/models/MaterialPackageUpdateRequest";
import type { SpaceMaterialPackageCreateRequest } from "@tuanchat/openapi-client/models/SpaceMaterialPackageCreateRequest";
import type { SpaceMaterialPackageImportRequest } from "@tuanchat/openapi-client/models/SpaceMaterialPackageImportRequest";
import type { SpaceMaterialPackagePageRequest } from "@tuanchat/openapi-client/models/SpaceMaterialPackagePageRequest";
import type { SpaceMaterialPackageUpdateRequest } from "@tuanchat/openapi-client/models/SpaceMaterialPackageUpdateRequest";
import { tuanchat } from "../instance";

export const MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE = 24;

type MaterialPackagePageResult = ApiResultPageBaseRespMaterialPackageResponse | ApiResultPageBaseRespSpaceMaterialPackageResponse;

export function getNextMaterialPackagePageRequest<TRequest extends { pageNo?: number; pageSize?: number }>(
  request: TRequest,
  lastPage: MaterialPackagePageResult,
  allPages: MaterialPackagePageResult[],
): TRequest | undefined {
  if (lastPage.data?.isLast) {
    return undefined;
  }
  if (lastPage.data?.list && lastPage.data.list.length === 0) {
    return undefined;
  }

  const currentPageNo = lastPage.data?.pageNo ?? allPages.length;
  const pageSize = lastPage.data?.pageSize ?? request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE;
  return {
    ...request,
    pageNo: currentPageNo + 1,
    pageSize,
  };
}

export function useMyMaterialPackagesQuery(request: MaterialPackagePageRequest, enabled = true) {
  return useQuery({
    queryKey: ["materialPackage", "my", request],
    queryFn: () => tuanchat.materialPackageController.pageMyPackages(request),
    enabled,
    staleTime: 10_000,
  });
}

export function usePublicMaterialPackagesQuery(request: MaterialPackagePageRequest, enabled = true) {
  return useQuery({
    queryKey: ["materialPackage", "public", request],
    queryFn: () => tuanchat.materialPackageController.pagePublicPackages(request),
    enabled,
    staleTime: 10_000,
  });
}

export function useMyMaterialPackagesInfiniteQuery(request: MaterialPackagePageRequest, enabled = true) {
  const initialPageParam = {
    ...request,
    pageNo: request.pageNo ?? 1,
    pageSize: request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  };
  return useInfiniteQuery({
    queryKey: ["materialPackage", "my", "infinite", initialPageParam],
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pageMyPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage, allPages) => getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    enabled,
    staleTime: 10_000,
  });
}

export function usePublicMaterialPackagesInfiniteQuery(request: MaterialPackagePageRequest, enabled = true) {
  const initialPageParam = {
    ...request,
    pageNo: request.pageNo ?? 1,
    pageSize: request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  };
  return useInfiniteQuery({
    queryKey: ["materialPackage", "public", "infinite", initialPageParam],
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pagePublicPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage, allPages) => getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    enabled,
    staleTime: 10_000,
  });
}

export function useCreateMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["materialPackage", "create"],
    mutationFn: (request: MaterialPackageCreateRequest) => tuanchat.materialPackageController.createPackage1(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "my"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "public"] });
    },
  });
}

export function useUpdateMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["materialPackage", "update"],
    mutationFn: (request: MaterialPackageUpdateRequest) => tuanchat.materialPackageController.updatePackage1(request),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "my"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "public"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "detail", variables.packageId] });
    },
  });
}

export function useDeleteMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["materialPackage", "delete"],
    mutationFn: (packageId: number) => tuanchat.materialPackageController.deletePackage1(packageId),
    onSuccess: (_result, packageId) => {
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "my"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "public"] });
      queryClient.removeQueries({ queryKey: ["materialPackage", "detail", packageId] });
    },
  });
}

export function useSpaceMaterialPackagesQuery(request: SpaceMaterialPackagePageRequest, enabled = true) {
  return useQuery({
    queryKey: ["spaceMaterialPackage", "page", request],
    queryFn: () => tuanchat.spaceMaterialPackageController.pagePackages(request),
    enabled,
    staleTime: 10_000,
  });
}

export function useSpaceMaterialPackagesInfiniteQuery(request: SpaceMaterialPackagePageRequest, enabled = true) {
  const initialPageParam = {
    ...request,
    pageNo: request.pageNo ?? 1,
    pageSize: request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  };
  return useInfiniteQuery({
    queryKey: ["spaceMaterialPackage", "page", "infinite", initialPageParam],
    queryFn: ({ pageParam }) => tuanchat.spaceMaterialPackageController.pagePackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage, allPages) => getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    enabled,
    staleTime: 10_000,
  });
}

export function useCreateSpaceMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["spaceMaterialPackage", "create"],
    mutationFn: (request: SpaceMaterialPackageCreateRequest) => tuanchat.spaceMaterialPackageController.createPackage(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] });
    },
  });
}

export function useUpdateSpaceMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["spaceMaterialPackage", "update"],
    mutationFn: (request: SpaceMaterialPackageUpdateRequest) => tuanchat.spaceMaterialPackageController.updatePackage(request),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] });
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "detail", variables.spacePackageId] });
    },
  });
}

export function useDeleteSpaceMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["spaceMaterialPackage", "delete"],
    mutationFn: ({ spaceId, spacePackageId }: { spaceId: number; spacePackageId: number }) =>
      tuanchat.spaceMaterialPackageController.deletePackage(spacePackageId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] });
      queryClient.removeQueries({ queryKey: ["spaceMaterialPackage", "detail", variables.spacePackageId] });
    },
  });
}

export function useImportSpaceMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["spaceMaterialPackage", "import"],
    mutationFn: (request: SpaceMaterialPackageImportRequest) => tuanchat.spaceMaterialPackageController.importPackage(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "my"] });
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "public"] });
    },
  });
}

