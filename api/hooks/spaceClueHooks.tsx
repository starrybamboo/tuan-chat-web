import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import type { ClueStarsCreateRequest } from "api/models/ClueStarsCreateRequest";
import type { SpaceClueCreateRequest } from "api/models/SpaceClueCreateRequest";

/**
 * 获取用户空间所有文件夹
 */
export function useGetMyClueStarsBySpaceQuery(spaceId: number) {
    return useQuery({
        queryKey: ["getMyClueStarsBySpace", spaceId],
        queryFn: () => tuanchat.spaceClue.getMyClueStarsBySpace(spaceId),
        staleTime: 10000,
        enabled: spaceId > 0,
    });
}

/**
 * 获取文件夹下所有线索
 */
export function useGetCluesByClueStarsQuery(clueStarsId: number) {
    return useQuery({
        queryKey: ["getCluesByClueStars", clueStarsId],
        queryFn: () => tuanchat.spaceClue.getCluesByClueStars(clueStarsId),
        staleTime: 10000,
        enabled: clueStarsId > 0,
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
            const clueStarsId = variables[0].clueStarsId;
            queryClient.invalidateQueries({ queryKey: ['getCluesByClueStars', clueStarsId] });
        }
    });
}

/**
 * 批量删除线索
 */
export function useDeleteCluesMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ids: Array<number>) => tuanchat.spaceClue.deleteClues(ids),
        mutationKey: ['deleteClues'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getCluesByClueStars'] });
        }
    });
}

/**
 * 添加文件夹
 */
export function useCreateClueStarsBatchMutation(spaceId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: Array<ClueStarsCreateRequest>) => tuanchat.spaceClue.createClueStarsBatch(req),
        mutationKey: ['addClues'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMyClueStarsBySpace', spaceId] });
        }
    });
}

/**
 * 删除文件夹
 */
export function useDeleteClueStarsMutation(spaceId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ids: Array<number>) => tuanchat.spaceClue.deleteClueStars(ids),
        mutationKey: ['addClues'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getMyClueStarsBySpace', spaceId] });
        }
    });
}