import type { HTMLAttributes } from "react";
import { useGetUserInfoQuery } from "../../../../api/queryHooks";

/**
 * 填入userId，返回一个包含用户名的span
 * 为什么要做这个组件呢？因为member不包含userId
 * @param userId
 * @param spanProps
 * @constructor
 */
export default function UserIdToName({
  userId,
  ...spanProps
}: {
  userId: number;
} & HTMLAttributes<HTMLSpanElement>) {
  const getUserInfoQuery = useGetUserInfoQuery(userId);
  return <span {...spanProps}>{getUserInfoQuery.data?.data?.username}</span>;
}
