import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {LikeRecordRequest} from "./likeQueryHooks";
import {tuanchat} from "../instance";
import type {CommentPageRequest} from "../models/CommentPageRequest";
import type {CommentAddRequest} from "../models/CommentAddRequest";

/**
 * 根据id获取评论
 */
export function useGetCommentByIdQuery(commentId: number){
    return useQuery({
        queryKey: ["getComment", commentId],
        queryFn: async () => {
            const res = await tuanchat.commentController.getComment(commentId);
            return res.data;
        },
        staleTime: 300 * 1000,
        enabled: commentId > 0
    })
}

/**
 * comment分页查询
 */
export function useGetCommentPageInfiniteQuery(targetInfo: LikeRecordRequest, pageSize: number = 10, childLimit:number = 9999,maxLevel:number = 99) {
    return useInfiniteQuery({
        queryKey: ["pageComments", targetInfo],
        queryFn: async ({ pageParam }) => {
            return tuanchat.commentController.pageComments(pageParam);
        },
        getNextPageParam: (lastPage,allPages) => {
            if (lastPage.data === undefined || lastPage.data.length === 0) {
                return undefined;
            }
            else {
                const params: CommentPageRequest = { ...targetInfo, pageSize, childLimit,maxLevel, pageNo: allPages.length + 1};
                return params;
            }
        },
        initialPageParam: { ...targetInfo, pageSize, childLimit,maxLevel, pageNo:1} as CommentPageRequest,
        refetchOnWindowFocus: false,
    });
}

/**
 * 发表comment
 */
export function useAddCommentMutation(){
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["addComment"],
        mutationFn: (req: CommentAddRequest)=> tuanchat.commentController.addComment(req),
        onSuccess:(_,variables)=>{
            //TODO 这么做是有问题的
            queryClient.invalidateQueries({ queryKey: ["pageComments", {targetId: variables.targetId, targetType: variables.targetType}]});
        }
    })
}
/**
 * 删除comment
 */
export function useDeleteCommentMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ["deleteComment"],
        mutationFn: async (commentId: number) =>{
            await tuanchat.commentController.deleteComment(commentId);
    },
        onSuccess:() => {
        // 删除成功后刷新评论列表缓存
        queryClient.invalidateQueries({ queryKey: ["pageComments"] });
    }
})}
