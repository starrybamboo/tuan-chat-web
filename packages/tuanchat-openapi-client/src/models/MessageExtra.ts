/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClueMessage } from './ClueMessage';
import type { CommandRequestExtra } from './CommandRequestExtra';
import type { DiceResult } from './DiceResult';
import type { DiceTurn } from './DiceTurn';
import type { DocCardExtra } from './DocCardExtra';
import type { FileMessage } from './FileMessage';
import type { ForwardMessage } from './ForwardMessage';
import type { ImageMessage } from './ImageMessage';
import type { PokeExtra } from './PokeExtra';
import type { RoomJumpExtra } from './RoomJumpExtra';
import type { SoundMessage } from './SoundMessage';
import type { StateEventExtra } from './StateEventExtra';
import type { VideoMessage } from './VideoMessage';
import type { WebgalChoosePayload } from './WebgalChoosePayload';
export type MessageExtra = {
    diceResult?: DiceResult;
    diceTurn?: DiceTurn;
    fileMessage?: FileMessage;
    imageMessage?: ImageMessage;
    forwardMessage?: ForwardMessage;
    soundMessage?: SoundMessage;
    videoMessage?: VideoMessage;
    clueMessage?: ClueMessage;
    webgalChoose?: WebgalChoosePayload;
    commandRequest?: CommandRequestExtra;
    docCard?: DocCardExtra;
    roomJump?: RoomJumpExtra;
    stateEvent?: StateEventExtra;
    poke?: PokeExtra;
};
