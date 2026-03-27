/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 创建局外素材包请求
 */
export type MaterialPackageCreateRequest = {
    /**
     * 素材包名称
     */
    name: string;
    /**
     * 素材包描述
     */
    description?: string;
    /**
     * 素材包封面URL
     */
    coverUrl?: string;
    /**
     * 是否公开，默认公开
     */
    isPublic?: boolean;
    content: MaterialPackageContent;
};

