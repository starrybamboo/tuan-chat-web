/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体文件业务别名绑定请求
 */
export type MediaFileAliasUpsertRequest = {
    /**
     * 别名命名空间，例如 tuan-chat-blocksuite:space:10001
     */
    namespace: string;
    /**
     * 业务侧稳定 key，例如 Blocksuite blob key
     */
    aliasKey: string;
    /**
     * 绑定的媒体文件 ID
     */
    fileId: number;
    /**
     * 期望媒体类型；为空表示不限制
     */
    expectedMediaType?: string;
};

