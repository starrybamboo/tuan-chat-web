/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BlocksuiteDocUpdatePushRequest = {
    /**
     * 实体类型(space/room/space_clue/user/space_user_doc/space_doc)
     */
    entityType: string;
    /**
     * 实体id
     */
    entityId: number;
    /**
     * 文档类型(description等)
     */
    docType: string;
    /**
     * 单条yjs update（base64）
     */
    updateB64: string;
    /**
     * 客户端ID（用于排查与去重，非必填）
     */
    clientId?: string;
};

