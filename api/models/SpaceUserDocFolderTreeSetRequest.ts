/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SpaceUserDocFolderTreeSetRequest = {
    /**
     * 空间ID
     */
    spaceId: number;
    /**
     * 期望版本号（乐观锁）
     */
    expectedVersion: number;
    /**
     * 文档夹树JSON
     */
    treeJson: string;
};

