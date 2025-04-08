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
     * 群成员类型 1群主 2管理员 3普通成员 4机器人
     */
    memberType?: number;
    createTime?: string;
    updateTime?: string;
};

