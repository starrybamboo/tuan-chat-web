/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 房间消息变更来源元数据
 */
export type RoomMessageMutationMeta = {
    /**
     * 来源入口：chat_input/message_editor/doc_view/import/ai
     */
    sourceSurface: string;
    /**
     * 操作原因：normal/undo/redo
     */
    operationCause: string;
};

