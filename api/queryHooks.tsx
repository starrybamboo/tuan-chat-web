// upload-utils.ts
import { tuanchat } from "./instance";

// 上传图片
export class UploadUtils {
  constructor(private readonly scene: number = 2) {}

  async upload(file: File): Promise<string> {
    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: file.name,
      scene: this.scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, file);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    return ossData.data.downloadUrl;
  }

  private async executeUpload(url: string, file: File): Promise<void> {
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "x-oss-acl": "public-read",
      },
    });

    if (!response.ok) {
      throw new Error(`文件传输失败: ${response.status}`);
    }
  }
}

// 用户查询
export function useUserQuery() {
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


// 角色查询
import type { UseQueryResult } from "@tanstack/react-query";

import type { ApiResultListRoleResponse, ApiResultRoleAbility, ApiResultUserInfoResponse, RoleAbility } from "api";

export function useRoleQuery(userQuery: UseQueryResult<ApiResultUserInfoResponse | undefined>) {
  const roleQuery = useQuery({
    queryKey: ["userRole", userQuery.data?.data?.userId],
    queryFn: async (): Promise<ApiResultListRoleResponse | undefined> => {
      const userId = userQuery.data?.data?.userId;
      if (userId === undefined) {
        console.error("用户ID不存在，无法获取角色信息");
        return undefined;
      }
      const res = await tuanchat.roleController.getUserRoles(userId);
      if (res.success === false || res.data === null) {
        console.error("角色信息获取失败或数据为空");
        return undefined;
      }
      return res;
    },
    enabled: !!userQuery.data?.data?.userId, // 只有当 userId 存在时才启用查询
  });
  return roleQuery;
}

// 查询头像
import { useQuery } from "@tanstack/react-query";

export function useRoleAvaterQuery(roleId: number) {
  const roleAvatarQuery = useQuery({
    queryKey: ["roleAvatar", roleId],
    queryFn: async (): Promise<string | undefined> => {
      try {
        const res = await tuanchat.avatarController.getRoleAvatars(roleId);
        if (
          res.success
          && Array.isArray(res.data)
          && res.data.length > 0
          && res.data[0]?.avatarUrl !== undefined
        ) {
          return res.data[0].avatarUrl as string;
        }
        else {
          console.warn(`角色 ${roleId} 的头像数据无效或为空`);
          return undefined;
        }
      }
      catch (error) {
        console.error(`加载角色 ${roleId} 的头像时出错`, error);
        return undefined;
      }
    },
    enabled: !!roleId,
  },
  );
  return roleAvatarQuery;
}


// 获取能力
export function useAbilityQuery(roleId: number) {
  const abilityQuery = useQuery({
    queryKey: ["ability", roleId],
    queryFn: async (): Promise<ApiResultRoleAbility | undefined> => {
      try {
        const res = await tuanchat.abilityController.getRoleAbility(roleId);
        if (
          res.success
          && res.data!==null
        ) {
          console.log(res.data);
          return res;
        }
        else {
          console.warn(`角色 ${roleId} 的能力数据无效或为空`);
          return undefined;
        }
      }
      catch (error) {
        console.error(`加载角色 ${roleId} 的能力时出错`, error);
        return undefined;
      }
    },
    enabled: !!roleId,
  },
  );
  return abilityQuery;
}

   

