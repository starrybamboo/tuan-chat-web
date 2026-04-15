/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 分页查询社区帖子请求
 */
export type PagePostRequest = {
    /**
     * 游标（上次翻页的最后一条记录的标识）
     */
    cursor?: number;
    /**
     * 每页大小
     */
    pageSize?: number;
    /**
     * 社区ID,获取社区帖子列表必填
     */
    communityId?: number;
    /**
     * 用户ID,用于查询特定用户的社区帖子,可选
     */
    userId?: number;
};

