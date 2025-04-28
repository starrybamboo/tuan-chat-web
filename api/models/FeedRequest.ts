/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Feed创建/修改请求
 */
export type FeedRequest = {
    /**
     * Feed ID，创建时不需要传，修改时必传
     */
    feedId?: number;
    /**
     * 关联的消息ID，无法修改
     */
    messageId?: number;
    /**
     * 标题
     */
    title: string;
    /**
     * 描述
     */
    description?: string;
};

