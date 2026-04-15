/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 通知列表项
 */
export type NotificationItemResponse = {
    notificationId?: number;
    category?: string;
    title?: string;
    content?: string;
    targetPath?: string;
    resourceType?: string;
    resourceId?: number;
    isRead?: boolean;
    readTime?: string;
    createTime?: string;
    payload?: Record<string, Record<string, any>>;
};

