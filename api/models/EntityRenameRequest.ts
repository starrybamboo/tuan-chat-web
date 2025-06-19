/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 修改实体name
 */
export type EntityRenameRequest = {
    /**
     * 模组ID
     */
    moduleId: number;
    oldName: string;
    newName: string;
    /**
     * 实体类型(item, role, scene)
     */
    entityType: string;
};

