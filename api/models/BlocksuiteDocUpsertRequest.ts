/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BlocksuiteDocUpsertRequest = {
    /**
     * 实体类型(space/room/user/space_user_doc/space_doc)
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
     * 快照(JSON字符串，v1包含updateB64等)
     */
    snapshot: string;
};

