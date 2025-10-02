/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 返回对象
 */
export type StageEntityResponse = {
    id?: number;
    name?: string;
    /**
     * 实体类型(item, role, scene)
     */
    entityType?: number;
    /**
     * 实体详情
     */
    entityInfo?: Record<string, any>;
    /**
     * change接口使用，1删除，2修改，3新增，若为新增，则只实体只有一个id
     */
    diffType?: number;
};

