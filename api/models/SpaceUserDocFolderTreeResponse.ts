/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Space 用户文档夹树返回
 */
export type SpaceUserDocFolderTreeResponse = {
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 用户ID（所有者）
     */
    userId?: number;
    /**
     * 当前版本号
     */
    version?: number;
    /**
     * 文档夹树JSON（为 null 表示尚未初始化）
     */
    treeJson?: string;
};

