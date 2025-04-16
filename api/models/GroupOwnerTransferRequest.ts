/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GroupOwnerTransferRequest = {
    /**
     * 房间号
     */
    roomId: number;
    /**
     * 需要添加管理的列表
     */
    uidList: Array<number>;
    /**
     * 转让后原群主的成员类型：1-观战(OB), 2-玩家(PL)
     */
    memberType: number;
};

