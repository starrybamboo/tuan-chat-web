import {useQuery} from "@tanstack/react-query";
import {tuanchat} from "../instance";

export function useGetUerSCBalanceQuery(userId: number){
    return useQuery({
        queryKey: ["getBalance", userId],
        queryFn: ()=> tuanchat.scWallets.getBalance(userId),
        staleTime: 300 * 1000,
        enabled: userId > 0
    })
}
