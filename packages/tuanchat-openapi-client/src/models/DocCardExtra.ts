/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocCardExtra = {
    /**
     * Blocksuite docId
     */
    docId: string;
    /**
     * 空间ID（用于同一 space 校验/降级）
     */
    spaceId?: number;
    /**
     * 标题兜底（可选）
     */
    title?: string;
    /**
     * 封面兜底（可选）
     */
    imageUrl?: string;
    /**
     * 摘要兜底（可选；前端卡片预览用）
     */
    excerpt?: string;
};

