/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type GroupMember = {
    roomId?: number;
    userId?: number;
    /**
     * 1 群主 2 管理员 3普通成员
     */
    memberType?: number;
    createTime?: string;
    updateTime?: string;
};

