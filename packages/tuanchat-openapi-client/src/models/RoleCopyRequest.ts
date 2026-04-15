/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 复制角色请求体
 */
export type RoleCopyRequest = {
    /**
     * 源角色ID
     */
    sourceRoleId: number;
    /**
     * 新角色名称，空时默认沿用源角色名称
     */
    newRoleName?: string;
    /**
     * 新角色简介，空时默认沿用源角色简介
     */
    newRoleDescription?: string;
    /**
     * 目标角色类型，当前仅支持 1（骰娘）
     */
    targetType?: number;
};

