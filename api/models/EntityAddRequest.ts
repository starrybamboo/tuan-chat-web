/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 添加到暂存区请求
 */
export type EntityAddRequest = {
    /**
     * ID
     */
    stageId: number;
    /**
     * 以name唯一标识一个实体，就像文件名标识一个文件
     */
    name: string;
    /**
     * 实体类型(item, role, scene)
     */
    entityType: string;
    /**
     * 操作类型，0添加或修改，1删除
     */
    operationType: number;
    /**
     * 实体内容，根据entityType类型传入不同对象：- 当entityType=item时，传入ModuleItemRequest对象- 当entityType=role时，传入ModuleRoleRequest对象- 当entityType=scene时，传入ModuleSceneRequest对象
     */
    entityInfo?: Record<string, any>;
};

