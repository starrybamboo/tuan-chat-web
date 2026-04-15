/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 资源上传请求
 */
export type ResourceUploadRequest = {
    /**
     * 资源类型
     */
    type: string;
    /**
     * 对应的oss url
     */
    url: string;
    /**
     * 资源名称
     */
    name: string;
    /**
     * 是否为AI资源
     */
    isAi?: boolean;
    /**
     * 是否公开
     */
    isPublic?: boolean;
};

