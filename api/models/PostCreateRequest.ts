/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 发布帖子请求
 */
export type PostCreateRequest = {
    /**
     * 社区ID
     */
    communityId: number;
    /**
     * 帖子标题
     */
    title: string;
    /**
     * 帖子内容
     */
    content?: string;
};

