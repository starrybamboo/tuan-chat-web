import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SpaceUserDocCreateRequest } from "../models/SpaceUserDocCreateRequest";
import type { SpaceUserDocFolderTreeSetRequest } from "../models/SpaceUserDocFolderTreeSetRequest";
import type { SpaceUserDocRenameRequest } from "../models/SpaceUserDocRenameRequest";
import { tuanchat } from "../instance";

export function useGetSpaceUserDocFolderTreeQuery(spaceId: number) {
  return useQuery({
    queryKey: ["getSpaceUserDocFolderTree", spaceId],
    queryFn: () => tuanchat.spaceUserDocFolderController.getTree(spaceId),
    enabled: spaceId > 0,
    staleTime: 60_000,
  });
}

export function useSetSpaceUserDocFolderTreeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["setSpaceUserDocFolderTree"],
    mutationFn: (req: SpaceUserDocFolderTreeSetRequest) => tuanchat.spaceUserDocFolderController.setTree(req),
    onSuccess: (res, variables) => {
      if (res?.success) {
        queryClient.setQueryData(["getSpaceUserDocFolderTree", variables.spaceId], res);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", variables.spaceId] });
    },
    onError: (_err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", variables.spaceId] });
    },
  });
}

export function useListSpaceUserDocsQuery(spaceId: number) {
  return useQuery({
    queryKey: ["listSpaceUserDocs", spaceId],
    queryFn: () => tuanchat.spaceUserDocFolderController.listDocs(spaceId),
    enabled: spaceId > 0,
    staleTime: 15_000,
  });
}

export function useCreateSpaceUserDocMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["createSpaceUserDoc"],
    mutationFn: (req: SpaceUserDocCreateRequest) => tuanchat.spaceUserDocFolderController.createDoc(req),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
      if (!res?.success) {
        queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", variables.spaceId] });
      }
    },
    onError: (_err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
    },
  });
}

export function useRenameSpaceUserDocMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["renameSpaceUserDoc"],
    mutationFn: (req: SpaceUserDocRenameRequest & { spaceId: number }) => {
      const { spaceId: _spaceId, ...payload } = req;
      return tuanchat.spaceUserDocFolderController.renameDoc(payload);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", variables.spaceId] });
    },
  });
}

export function useDeleteSpaceUserDocMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSpaceUserDoc"],
    mutationFn: (req: { spaceId: number; docId: number }) => tuanchat.spaceUserDocFolderController.deleteDoc(req.docId),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
      queryClient.invalidateQueries({ queryKey: ["getSpaceUserDocFolderTree", variables.spaceId] });
    },
  });
}
