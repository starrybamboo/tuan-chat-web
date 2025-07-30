/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EntityAddRequest = {
    stageId: number;
    /**
     * 实体类型(item, role, location, scene, map)，见https://ycn45b70r8yz.feishu.cn/wiki/Im2Nw8XbFiN1EvkHBYYcyUUcnde
     */
    entityType: number;
    name: string;
    /**
     * 实体内容，根据entityType类型传入不同对象：- 当entityType=item时，传入ModuleItemRequest对象- 当entityType=role时，传入ModuleRoleRequest对象- 当entityType=scene时，传入ModuleSceneRequest对象
     */
    entityInfo?: Record<string, any>;
};

