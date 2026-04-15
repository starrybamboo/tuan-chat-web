/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 标签表
 */
export type Tag = {
    tagId?: number;
    /**
     * tag的内容
     */
    content?: string;
    /**
     * tag的类型 1.用户 2.模组 3.收藏
     */
    tagType?: number;
    /**
     * tag的颜色
     */
    color?: string;
    /**
     * 目标ID，通常是用户ID、模组ID或收藏ID等
     */
    targetId?: number;
    createTime?: string;
    updateTime?: string;
};

