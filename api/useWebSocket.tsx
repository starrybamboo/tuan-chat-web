import {useState, useRef, useCallback, useEffect} from 'react'
import type {ChatMessageRequest} from "./models/ChatMessageRequest";
import type {ChatMessageResponse} from "./models/ChatMessageResponse";
import {useImmer} from "use-immer";
import {formatLocalDateTime} from "@/utils/dataUtil";
import {useGlobalContext} from "@/components/globalContextProvider";
import {TuanChat} from "./TuanChat";

type WsMessageType =
    | 2 // 心跳
    | 3 // 聊天消息
    | 4 // 聊天消息同步

interface WsMessage<T> {
    type: WsMessageType
    data?: T
}

export interface WebsocketUtils{
    connect: () => void
    send: (request: ChatMessageRequest) => void
    getNewMessagesByRoomId: (roomId: number) => ChatMessageResponse[]
    isConnected: boolean
}

const WS_URL = import.meta.env.VITE_API_WS_URL
// const WS_URL = "ws://39.103.58.31:8090"
export function useWebSocket() {
    // let token = "-1"
    const wsRef = useRef<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(()=>{}))
    // 接受消息的存储
    const [roomMessages, updateRoomMessages] = useImmer<Record<number, ChatMessageResponse[]>>({})

    let token = ""

    if (typeof window !== 'undefined') {
       token = localStorage.getItem("token") ?? "-1"
    }
    // 配置参数
    const MAX_RECONNECT_ATTEMPTS = 12
    const HEARTBEAT_INTERVAL = 25000
    const RECONNECT_DELAY_BASE = 10

    // 核心连接逻辑
    const connect = useCallback(() => {
        if (wsRef.current || !WS_URL) return

        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !isConnected) {
                connect()
            }
        });

        try {
            wsRef.current = new WebSocket(`${WS_URL}?token=${token}`)

            wsRef.current.onopen = () => {
                console.log('WebSocket connected')
                setIsConnected(true)
                startHeartbeat()
            }

            wsRef.current.onclose = (event) => {
                console.log(`Close code: ${event.code}, Reason: ${event.reason}`)
                setIsConnected(false)
                // handleReconnect(MAX_RECONNECT_ATTEMPTS)
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const message: WsMessage<ChatMessageResponse> = JSON.parse(event.data)
                    console.log('Received message:', JSON.stringify(message))
                    if(!(message.data?.message.createTime) && message.data != undefined){
                        message.data.message.createTime = formatLocalDateTime(new Date())
                    }
                    if(message.data!=undefined && message.data){
                        updateRoomMessages(draft => {
                            const chatMessageResponse = message.data!
                            if (chatMessageResponse.message.roomId in draft) {
                                // 查找已存在消息的索引
                                const existingIndex = draft[chatMessageResponse.message.roomId].findIndex(
                                    (msg) => msg.message.messageID === chatMessageResponse.message.messageID
                                );
                                if (existingIndex !== -1) {
                                    // 更新已存在的消息
                                    draft[chatMessageResponse.message.roomId][existingIndex] = chatMessageResponse;
                                } else {
                                    draft[chatMessageResponse.message.roomId].push(chatMessageResponse);
                                }
                            } else {
                                draft[chatMessageResponse.message.roomId] = [chatMessageResponse];
                            }
                        })
                    }
                } catch (error) {
                    console.error('Message parsing failed:', error)
                }
            }

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error)
                wsRef.current?.close()
            }

        } catch (error) {
            console.error('Connection failed:', error)
            handleReconnect(MAX_RECONNECT_ATTEMPTS)
        }
    }, [])

    // 重连机制
    const handleReconnect = useCallback((remainAttempts:number) => {
        if (remainAttempts === 0 || isConnected) return
        connect()
        const delay = Math.min(
            RECONNECT_DELAY_BASE * Math.pow(2, MAX_RECONNECT_ATTEMPTS - remainAttempts),
            30000
        )
        console.log(`Reconnecting in ${delay}ms...`)
        setTimeout(() => handleReconnect(remainAttempts - 1),delay)
    }, [connect])

    // 心跳机制
    const startHeartbeat = useCallback(() => {
        stopHeartbeat()
        heartbeatTimer.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 2 })) // 发送标准心跳
            }
        }, HEARTBEAT_INTERVAL)
    }, [])

    const stopHeartbeat = useCallback(() => {
        heartbeatTimer.current && clearInterval(heartbeatTimer.current)
    }, [])

    async function send(request : ChatMessageRequest) {
        if (!isConnected){
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            handleReconnect(MAX_RECONNECT_ATTEMPTS)
        }
        for (let i = 0; i < 1000; i++){
            if (wsRef.current?.readyState === WebSocket.OPEN) break
            await new Promise(resolve => setTimeout(resolve, 100))
        }
        try{
            const message: WsMessage<ChatMessageRequest> = {
                type: 3, // 聊天消息类型
                data: request
            }
            wsRef?.current?.send(JSON.stringify(message))
            console.log('Sent message:', JSON.stringify(message))
        }catch (e){
            console.error('Message Serialization Failed:', e)
        }
    }

    //
    const getNewMessagesByRoomId = (roomId: number): ChatMessageResponse[] => {
        return roomMessages[roomId] || []
    }

    const webSocketUtils:WebsocketUtils = {
        isConnected,
        getNewMessagesByRoomId,
        connect,
        send,
    }
    return webSocketUtils
}
