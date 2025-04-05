import type { ApiResultUserInfoResponse } from "api";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";

export default function useUserQuery() {
  const userQuery = useQuery({
    queryKey: ["userId"],
    queryFn: async (): Promise<ApiResultUserInfoResponse | undefined> => {
      const res = await tuanchat.userController.getUserInfo(10001);
      if (res.success === false || res.data === null) {
        console.error("用户信息获取失败或数据为空");
        return undefined; // 返回 undefined 表示获取失败
      }
      return res;
    },
  },
  );
  return userQuery;
}
