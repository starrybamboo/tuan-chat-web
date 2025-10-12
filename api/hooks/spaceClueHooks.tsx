import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import type { SpaceClueCreateRequest } from "api/models/SpaceClueCreateRequest";

/**
 * 根据空间ID倒序查询线索列表
 */
export function useGetCluesBySpaceQuery(spaceId: number) {
    return useQuery({
        queryKey: ["getCluesBySpace", spaceId],
        queryFn: () => tuanchat.spaceClue.getCluesBySpace(spaceId),
        staleTime: 10000,
        enabled: spaceId > 0,
    });
}

/**
 * 批量添加线索
 */
export function useAddCluesMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: Array<SpaceClueCreateRequest>) => tuanchat.spaceClue.addClues(req),
        mutationKey: ['addClues'],
        onSuccess: (_, variables) => {
            if (variables.length > 0) {
                const spaceId = variables[0].spaceId;
                queryClient.invalidateQueries({ queryKey: ['getCluesBySpace', spaceId] });
            }
        }
    });
}