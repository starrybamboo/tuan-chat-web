/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CollectEventMeta } from './CollectEventMeta';
import type { ContributeEventMeta } from './ContributeEventMeta';
import type { FollowEventMeta } from './FollowEventMeta';
import type { MessageFeedEventMeta } from './MessageFeedEventMeta';
import type { MessageFeedMeta } from './MessageFeedMeta';
import type { ModuleEventMeta } from './ModuleEventMeta';
import type { MomentFeedMeta } from './MomentFeedMeta';
import type { PlayEventMeta } from './PlayEventMeta';
import type { PostEventMeta } from './PostEventMeta';
import type { PostFeedMeta } from './PostFeedMeta';
/**
 * Feed元数据，JSON格式
 */
export type MetaData = {
    messageFeedMeta?: MessageFeedMeta;
    postFeedMeta?: PostFeedMeta;
    momentFeedMeta?: MomentFeedMeta;
    contributeEventMeta?: ContributeEventMeta;
    followEventMeta?: FollowEventMeta;
    collectEventMeta?: CollectEventMeta;
    moduleEventMeta?: ModuleEventMeta;
    playEventMeta?: PlayEventMeta;
    postEventMeta?: PostEventMeta;
    messageFeedEventMeta?: MessageFeedEventMeta;
};

