/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 媒体资源来源
 */
export type MediaSource = {
    /**
     * 来源类型：internal/external
     */
    kind: string;
    /**
     * 内部媒体文件 ID，仅 internal 来源使用
     */
    fileId?: number;
    /**
     * 外链资源 URL，仅 external 来源使用
     */
    url?: string;
    /**
     * 外部来源标识，如 cq
     */
    provider?: string;
    internalFile?: boolean;
};

