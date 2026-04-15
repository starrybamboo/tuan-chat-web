/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 添加标签请求
 */
export type TagAddRequest = {
    /**
     * 标签内容
     */
    content: string;
    /**
     * 标签类型 1.用户 2.模组 3.收藏
     */
    tagType: number;
    /**
     * 标签颜色
     */
    color: string;
    /**
     * 目标ID，通常是用户ID、模组ID或收藏ID
     */
    targetId: number;
};

