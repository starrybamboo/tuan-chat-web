/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 客户端高频元数据批量查询请求
 */
export type ClientMetadataBatchRequest = {
    /**
     * 角色 ID 列表，最多 100 个
     */
    roleIds?: Array<number>;
    /**
     * 用户 ID 列表，最多 100 个
     */
    userIds?: Array<number>;
    /**
     * 头像 ID 列表，最多 100 个
     */
    avatarIds?: Array<number>;
};

