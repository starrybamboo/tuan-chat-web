/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type OssResp = {
    /**
     * 上传的临时url
     */
    uploadUrl?: string;
    /**
     * 成功后能够下载的url
     */
    downloadUrl?: string;
    /**
     * 上传到临时url时必须携带的请求头
     */
    uploadHeaders?: Record<string, string>;
};

