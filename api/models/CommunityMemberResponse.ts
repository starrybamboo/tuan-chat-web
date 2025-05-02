/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 社区成员响应
 */
export type CommunityMemberResponse = {
    /**
     * 社区ID
     */
    communityId?: number;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 状态：0-正常，1-禁言，2-踢出
     */
    status?: string;
    /**
     * 加入时间
     */
    createTime?: string;
};

