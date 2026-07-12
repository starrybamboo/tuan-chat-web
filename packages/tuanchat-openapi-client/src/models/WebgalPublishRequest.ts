/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WebgalPublishClientPackage } from './WebgalPublishClientPackage';
export type WebgalPublishRequest = {
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 归档 commitId，可选
     */
    commitId?: number;
    /**
     * 前端预生成的发布包，可选
     */
    packageData?: WebgalPublishClientPackage;
};

