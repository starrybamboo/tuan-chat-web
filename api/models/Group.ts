/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type Group = {
    /**
     * 房间id
     */
    roomId: number;
    /**
     * 群聊名称
     */
    name: string;
    /**
     * 群聊头像
     */
    avatar: string;
    /**
     * 群描述
     */
    description: string;
    /**
     * 群状态 0正常 1 删除
     */
    status: number;
    createTime?: string;
    updateTime?: string;
    /**
     * 父群聊
     */
    parentGroupId: number;
};

