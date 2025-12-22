/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CommitRequest = {
    spaceId: number;
    /**
     * （还没做）选择提交的id，为空则全部提交（TODO）
     */
    ids?: Array<number>;
    message: string;
    /**
     * 选项,最低位为1则不删除暂存区
     */
    optionMask?: number;
};

