/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Blocksuite文档updates压缩请求（配合客户端/服务端的快照合并）
 */
export type BlocksuiteDocCompactRequest = {
    /**
     * 实体类型(space/room/space_clue/user/space_user_doc/space_doc)
     */
    entityType: string;
    /**
     * 实体ID
     */
    entityId: number;
    /**
     * 文档类型(description/readme等)
     */
    docType: string;
    /**
     * 删除 <= 该 serverTime(ms) 的 updates
     */
    beforeOrEqServerTime: number;
};

