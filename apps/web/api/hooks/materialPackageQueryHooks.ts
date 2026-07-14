import type { QueryClient } from "@tanstack/react-query";

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
import {
  beginMaterialPackageDeleteOptimisticMutation,
  beginMaterialPackageUpdateOptimisticMutation,
  beginSpaceMaterialPackageDeleteOptimisticMutation,
  beginSpaceMaterialPackageUpdateOptimisticMutation,
  rollbackMaterialPackageOptimisticMutation,
} from "./materialPackageOptimisticCache";

export const MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE = 24;

type MaterialPackagePageResult = ApiResultPageBaseRespMaterialPackageResponse | ApiResultPageBaseRespSpaceMaterialPackageResponse;
type MaterialPackagePageInitialRequest = MaterialPackagePageRequest & {
  pageNo: number;
  pageSize: number;
};
type SpaceMaterialPackagePageInitialRequest = SpaceMaterialPackagePageRequest & {
  pageNo: number;
  pageSize: number;
};

export function normalizeMaterialPackagePageRequest(request: MaterialPackagePageRequest): MaterialPackagePageInitialRequest {
  return {
    ...request,
    pageNo: request.pageNo ?? 1,
    pageSize: request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  };
}

export function normalizeSpaceMaterialPackagePageRequest(request: SpaceMaterialPackagePageRequest): SpaceMaterialPackagePageInitialRequest {
  return {
    ...request,
    pageNo: request.pageNo ?? 1,
    pageSize: request.pageSize ?? MATERIAL_PACKAGE_LIBRARY_PAGE_SIZE,
  };
}

export function myMaterialPackagesInfiniteQueryKey(request: MaterialPackagePageRequest) {
  return ["materialPackage", "my", "infinite", normalizeMaterialPackagePageRequest(request)] as const;
}

export function publicMaterialPackagesInfiniteQueryKey(request: MaterialPackagePageRequest) {
  return ["materialPackage", "public", "infinite", normalizeMaterialPackagePageRequest(request)] as const;
}

export function spaceMaterialPackagesInfiniteQueryKey(request: SpaceMaterialPackagePageRequest) {
  return ["spaceMaterialPackage", "page", "infinite", normalizeSpaceMaterialPackagePageRequest(request)] as const;
}

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
  const initialPageParam = normalizeMaterialPackagePageRequest(request);
  return useInfiniteQuery({
    queryKey: myMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pageMyPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    enabled,
    staleTime: 10_000,
  });
}

export function usePublicMaterialPackagesInfiniteQuery(request: MaterialPackagePageRequest, enabled = true) {
  const initialPageParam = normalizeMaterialPackagePageRequest(request);
  return useInfiniteQuery({
    queryKey: publicMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pagePublicPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
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
    onMutate: request => beginMaterialPackageUpdateOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackMaterialPackageOptimisticMutation(queryClient, transaction),
    onSettled: (_result, _error, variables) => {
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
    onMutate: packageId => beginMaterialPackageDeleteOptimisticMutation(queryClient, packageId),
    onError: (_error, _packageId, transaction) => rollbackMaterialPackageOptimisticMutation(queryClient, transaction),
    onSuccess: (_result, packageId) => {
      queryClient.removeQueries({ queryKey: ["materialPackage", "detail", packageId] });
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "my"] }),
      queryClient.invalidateQueries({ queryKey: ["materialPackage", "public"] }),
    ]),
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
  const initialPageParam = normalizeSpaceMaterialPackagePageRequest(request);
  return useInfiniteQuery({
    queryKey: spaceMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.spaceMaterialPackageController.pagePackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    enabled,
    staleTime: 10_000,
  });
}

export function fetchMyMaterialPackagesFirstPageWithCache(queryClient: QueryClient, request: MaterialPackagePageRequest) {
  const initialPageParam = normalizeMaterialPackagePageRequest(request);
  return queryClient.fetchInfiniteQuery({
    queryKey: myMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pageMyPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    staleTime: 10_000,
  });
}

export function fetchPublicMaterialPackagesFirstPageWithCache(queryClient: QueryClient, request: MaterialPackagePageRequest) {
  const initialPageParam = normalizeMaterialPackagePageRequest(request);
  return queryClient.fetchInfiniteQuery({
    queryKey: publicMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.materialPackageController.pagePublicPackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
    staleTime: 10_000,
  });
}

export function fetchSpaceMaterialPackagesFirstPageWithCache(queryClient: QueryClient, request: SpaceMaterialPackagePageRequest) {
  const initialPageParam = normalizeSpaceMaterialPackagePageRequest(request);
  return queryClient.fetchInfiniteQuery({
    queryKey: spaceMaterialPackagesInfiniteQueryKey(request),
    queryFn: ({ pageParam }) => tuanchat.spaceMaterialPackageController.pagePackages(pageParam),
    initialPageParam,
    getNextPageParam: (lastPage: MaterialPackagePageResult, allPages: MaterialPackagePageResult[]) =>
      getNextMaterialPackagePageRequest(initialPageParam, lastPage, allPages),
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
    onMutate: request => beginSpaceMaterialPackageUpdateOptimisticMutation(queryClient, request),
    onError: (_error, _request, transaction) => rollbackMaterialPackageOptimisticMutation(queryClient, transaction),
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] });
      queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "detail", variables.spacePackageId] });
    },
  });
}

export function useDeleteSpaceMaterialPackageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["spaceMaterialPackage", "delete"],
    mutationFn: ({ spaceId: _spaceId, spacePackageId }: { spaceId: number; spacePackageId: number }) =>
      tuanchat.spaceMaterialPackageController.deletePackage(spacePackageId),
    onMutate: ({ spacePackageId }) => beginSpaceMaterialPackageDeleteOptimisticMutation(queryClient, spacePackageId),
    onError: (_error, _variables, transaction) => rollbackMaterialPackageOptimisticMutation(queryClient, transaction),
    onSuccess: (_result, variables) => {
      queryClient.removeQueries({ queryKey: ["spaceMaterialPackage", "detail", variables.spacePackageId] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["spaceMaterialPackage", "page"] }),
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
