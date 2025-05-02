/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpaceAddRequest = {
    /**
     * 邀请的uid列表
     */
    userIdList: Array<number>;
    /**
     * 空间名称
     */
    spaceName?: string;
    /**
     * 空间头像
     */
    avatar?: string;
    /**
     * 空间规则
     */
    ruleId: number;
};

