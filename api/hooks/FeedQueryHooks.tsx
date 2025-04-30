import {useMutation, useQuery} from "@tanstack/react-query";
import type {FeedRequest} from "../models/FeedRequest";
import {tuanchat} from "../instance";

/**
 * feed
 */
export function usePublishFeedMutation(){
    return useMutation({
        mutationKey: ["publishFeed"],
        mutationFn: async (feed: FeedRequest) => {
            const res = await tuanchat.feedController.publishFeed(feed);
        }
    })
}
export function useGetFeedByIdQuery(feedId: number){
    return useQuery({
        queryKey: ["getFeedById", feedId],
        queryFn: async () => {
            const res = await tuanchat.feedController.getFeedById(feedId);
            return res.data;
        },
        staleTime: 300 * 1000
    })
}
