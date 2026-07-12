/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpaceMemberTypeUpdateRequest = {
    /**
     * 空间号
     */
    spaceId: number;
    /**
     * 需要更新的成员列表
     */
    uidList: Array<number>;
    /**
     * 目标成员类型：2玩家 3观战 5副主持人
     */
    memberType: number;
};

