/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 数据列表
 */
export type UserFollowResponse = {
    /**
     * 用户的uid，全局唯一
     */
    userId?: number;
    /**
     * 当前登录用户与该用户的关系状态 0未关注、1已关注、2互相关注
     */
    status?: number;
};

