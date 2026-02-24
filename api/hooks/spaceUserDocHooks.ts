import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SpaceUserDocCreateRequest } from "../models/SpaceUserDocCreateRequest";
import type { SpaceUserDocRenameRequest } from "../models/SpaceUserDocRenameRequest";
import type { SpaceUserDocTagUpdateRequest } from "../models/SpaceUserDocTagUpdateRequest";
import { tuanchat } from "../instance";

export function useListSpaceUserDocsQuery(spaceId: number, tag?: string) {
  return useQuery({
    queryKey: ["listSpaceUserDocs", spaceId, tag ?? ""],
    queryFn: () => tuanchat.spaceUserDocController.listDocs(spaceId, tag),
    enabled: spaceId > 0,
    staleTime: 15_000,
  });
}

export function useCreateSpaceUserDocMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["createSpaceUserDoc"],
    mutationFn: (req: SpaceUserDocCreateRequest) => tuanchat.spaceUserDocController.createDoc1(req),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
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
      return tuanchat.spaceUserDocController.renameDoc(payload);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
    },
  });
}

export function useUpdateSpaceUserDocTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["updateSpaceUserDocTag"],
    mutationFn: (req: SpaceUserDocTagUpdateRequest & { spaceId: number }) => {
      const { spaceId: _spaceId, ...payload } = req;
      return tuanchat.spaceUserDocController.updateDocTag(payload);
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
    },
  });
}

export function useDeleteSpaceUserDocMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["deleteSpaceUserDoc"],
    mutationFn: (req: { spaceId: number; docId: number }) => tuanchat.spaceUserDocController.deleteDoc1(req.docId),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listSpaceUserDocs", variables.spaceId] });
    },
  });
}
