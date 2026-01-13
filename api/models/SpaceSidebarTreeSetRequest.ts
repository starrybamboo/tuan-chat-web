/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 设置空间侧边栏频道树请求
 */
export type SpaceSidebarTreeSetRequest = {
    /**
     * 空间ID
     */
    spaceId: number;
    /**
     * 期望版本号（乐观锁）
     */
    expectedVersion: number;
    /**
     * 频道树JSON
     */
    treeJson: string;
};

