import { useState, useRef, useCallback } from 'react'
import type {ChatMessageRequest} from "./models/ChatMessageRequest";
import type {ChatMessageResponse} from "./models/ChatMessageResponse";
import {useImmer} from "use-immer";
import {formatLocalDateTime} from "@/utils/dataUtil";

type WsMessageType =
    | 2 // 心跳
    | 3 // 聊天消息
    | 4 // 聊天消息同步

interface WsMessage<T> {
    type: WsMessageType
    data?: T
}

const WS_URL = import.meta.env.VITE_API_WS_URL
// const WS_URL = "ws://39.103.58.31:8090"

const token = "10001"

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const reconnectAttempts = useRef(0)
    const heartbeatTimer = useRef<NodeJS.Timeout>(setTimeout(()=>{}))
    // 接受消息的存储
    const [groupMessages, updateGroupMessages] = useImmer<Record<number, ChatMessageResponse[]>>({})

    // 配置参数
    const MAX_RECONNECT_ATTEMPTS = 5
    const HEARTBEAT_INTERVAL = 25000
    const RECONNECT_DELAY_BASE = 1

    // 核心连接逻辑
    const connect = useCallback(() => {
        if (wsRef.current || !WS_URL) return

        try {
            wsRef.current = new WebSocket(`${WS_URL}?token=${token}`)

            wsRef.current.onopen = () => {
                console.log('WebSocket connected')
                setIsConnected(true)
                reconnectAttempts.current = 0
                startHeartbeat()
            }

            wsRef.current.onclose = (event) => {
                console.log(`Close code: ${event.code}, Reason: ${event.reason}`)
                setIsConnected(false)
                handleReconnect()
            }

            wsRef.current.onmessage = (event) => {
                try {
                    const message: WsMessage<ChatMessageResponse> = JSON.parse(event.data)
                    console.log('Received message:', JSON.stringify(message))
                    if(!(message.data?.message.createTime) && message.data != undefined){
                        message.data.message.createTime = formatLocalDateTime(new Date())
                    }
                    if(message.data!=undefined && message.data){
                        updateGroupMessages(draft => {
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
            handleReconnect()
        }
    }, [])

    // 重连机制
    const handleReconnect = useCallback(() => {
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnect attempts reached')
            return
        }

        const delay = Math.min(
            RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts.current),
            30000
        )

        reconnectAttempts.current++
        console.log(`Reconnecting in ${delay}ms...`)

        const timer = setTimeout(() => connect(), delay)
        return () => clearTimeout(timer)
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

    // // 清理资源
    // useEffect(() => {
    //     return () => {
    //         stopHeartbeat()
    //         wsRef.current?.close()
    //     }
    // }, [stopHeartbeat])


    function send(request : ChatMessageRequest) {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            try{
                const message: WsMessage<ChatMessageRequest> = {
                    type: 3, // 聊天消息类型
                    data: request
                }
                wsRef.current.send(JSON.stringify(message))
                console.log('Sent message:', JSON.stringify(message))
            }catch (e){
                console.error('Message Serialization Failed:', e)
            }
        } else {
            console.error('Cannot send message - connection not ready')
            connect();
        }
    }

    //
    const getNewMessagesByRoomId = (roomId: number): ChatMessageResponse[] => {
        return groupMessages[roomId] || []
    }

    return {
        isConnected,
        getNewMessagesByRoomId,
        connect,
        send,
    }
}
