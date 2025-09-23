import { getLocalStorageValue } from "@/components/common/customHooks/useLocalStorage";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { ttsApi } from "@/tts/apis";
import type { InferRequest } from "@/tts/apis";
import type {
  VolunteerRegisterRequest,
  VolunteerHeartbeatRequest,
  TaskRequestMessage,
  TaskResultSubmission,
  TaskAssignmentEvent,
  TaskCancellationRequest
} from "./wsModels";

interface WsMessage<T> {
  type: number;
  data?: T;
}

// 当前仅支持的任务类型：文字转语音
type AllowedTaskType = "TEXT_TO_SPEECH";
const ONLY_TASK_TYPE: AllowedTaskType = "TEXT_TO_SPEECH";

/**
 * 志愿计算任务状态
 */
export interface VolunteerTask {
  taskId: number;
  taskType: AllowedTaskType;
  taskName: string;
  inputData: string;
  estimatedDuration?: number;
  startTime: Date;
  status: "ASSIGNED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
}

/**
 * 志愿者系统信息
 */
export interface SystemInfo {
  cpuUsage: number;
  memoryUsage: number;
  availableSlots: number;
}

/**
 * 志愿计算WebSocket工具接口
 */
export interface VolunteerWebSocketUtils {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  
  // 志愿者管理
  registerVolunteer: (request: VolunteerRegisterRequest) => void;
  sendHeartbeat: (heartbeat: VolunteerHeartbeatRequest) => void;
  
  // 任务管理
  requestTasks: (request: TaskRequestMessage) => void;
  submitTaskResult: (result: TaskResultSubmission) => void;
  cancelTask: (cancellation: TaskCancellationRequest) => void;
  // 本地直接创建并执行TTS任务（不依赖服务端分配）
  createTtsTask: (params: InferRequest & { taskName?: string }) => Promise<{ taskId: number; success: boolean; error?: string }>;
  
  // 状态管理
  assignedTasks: VolunteerTask[];
  isRegistered: boolean;
  volunteerStatus: "IDLE" | "ACTIVE" | "BUSY";
  systemInfo: SystemInfo | null;
  
  // 事件回调设置
  setCallbacks: (callbacks: {
    onTaskAssigned?: (task: TaskAssignmentEvent) => void;
    onTaskCancelled?: (taskId: number, reason: string) => void;
    onRegistrationSuccess?: () => void;
    onRegistrationFailure?: (error: string) => void;
  }) => void;
  
  // 事件回调
  onTaskAssigned?: (task: TaskAssignmentEvent) => void;
  onTaskCancelled?: (taskId: number, reason: string) => void;
  onRegistrationSuccess?: () => void;
  onRegistrationFailure?: (error: string) => void;
}

const WS_URL = import.meta.env.VITE_API_WS_URL;

export function useVolunteerWebSocket(): VolunteerWebSocketUtils {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  // 状态管理
  const [assignedTasks, updateAssignedTasks] = useImmer<VolunteerTask[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [volunteerStatus, setVolunteerStatus] = useState<"IDLE" | "ACTIVE" | "BUSY">("IDLE");
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  // 事件回调 - 使用 useRef 避免重复渲染
  const callbacksRef = useRef<{
    onTaskAssigned?: (task: TaskAssignmentEvent) => void;
    onTaskCancelled?: (taskId: number, reason: string) => void;
    onRegistrationSuccess?: () => void;
    onRegistrationFailure?: (error: string) => void;
  }>({});

  // 设置回调函数
  const setCallbacks = useCallback((newCallbacks: {
    onTaskAssigned?: (task: TaskAssignmentEvent) => void;
    onTaskCancelled?: (taskId: number, reason: string) => void;
    onRegistrationSuccess?: () => void;
    onRegistrationFailure?: (error: string) => void;
  }) => {
    callbacksRef.current = newCallbacks;
  }, []);

  const token = getLocalStorageValue<number>("token", -1);
  const HEARTBEAT_INTERVAL = 30000; // 30秒自动心跳间隔 - 连接成功后自动开始
  const MAX_RECONNECT_ATTEMPTS = 5;

  const isConnected = useCallback(() => {
    return wsRef.current?.readyState === WebSocket.OPEN;
  }, []);

  const send = useCallback((message: WsMessage<any>) => {
    const timestamp = new Date().toISOString();
    const messageTypeMap: Record<number, string> = {
      10000: "志愿者注册",
      10001: "志愿者心跳", 
      10002: "请求任务",
      10003: "提交任务结果",
      10005: "任务取消"
    };
    
    const messageTypeName = messageTypeMap[message.type] || `未知类型(${message.type})`;
    
    if (isConnected()) {
      const messageStr = JSON.stringify(message);
      wsRef.current?.send(messageStr);
      
      // 记录发送日志
      console.warn(`[WebSocket发送] ${timestamp}`, {
        类型: messageTypeName,
        消息类型: message.type,
        数据: message.data,
        原始消息: messageStr
      });
    } else {
      console.warn(`[WebSocket发送失败] ${timestamp} - 连接未建立`, {
        类型: messageTypeName,
        消息类型: message.type,
        数据: message.data
      });
    }
  }, [isConnected]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
    }
    
    heartbeatTimer.current = setInterval(() => {
      // 只要已注册就发送心跳，不依赖其他状态
      if (isRegistered) {
        // 获取当前最新的状态信息
        const currentRunningTasks = assignedTasks.filter(task => task.status === "RUNNING").length;
        const currentStatus = currentRunningTasks >= 1 ? "BUSY" : "IDLE";
        
        // 构建心跳数据，如果没有系统信息就使用默认值
        const heartbeat: VolunteerHeartbeatRequest = {
          status: currentStatus,
          currentTasks: currentRunningTasks,
          systemInfo: systemInfo || {
            cpuUsage: 0,
            memoryUsage: 512,
            availableSlots: Math.max(0, 1 - currentRunningTasks)
          }
        };
        
        send({
          type: 10001,
          data: heartbeat
        });
        
        const timestamp = new Date().toISOString();
        console.warn(`[自动心跳] ${timestamp} - 发送心跳信息`, {
          志愿者状态: heartbeat.status,
          当前任务数: heartbeat.currentTasks,
          CPU使用率: `${heartbeat.systemInfo.cpuUsage.toFixed(1)}%`,
          内存使用: `${heartbeat.systemInfo.memoryUsage.toFixed(1)}MB`,
          可用槽位: heartbeat.systemInfo.availableSlots,
          心跳时间: timestamp
        });
      }
    }, HEARTBEAT_INTERVAL);
  }, [send]); // 只依赖 send 函数

  const handleMessage = useCallback((event: MessageEvent) => {
    const timestamp = new Date().toISOString();
    
    try {
      const message: WsMessage<any> = JSON.parse(event.data);
      
      const receiveMessageTypeMap: Record<number, string> = {
        10004: "任务分配",
        10005: "任务取消",
        100: "Token失效"
      };
      
      const messageTypeName = receiveMessageTypeMap[message.type] || `未知类型(${message.type})`;
      
      // 记录接收日志
      console.warn(`[WebSocket接收] ${timestamp}`, {
        类型: messageTypeName,
        消息类型: message.type,
        数据: message.data,
        原始消息: event.data
      });
      
      switch (message.type) {
        case 10004: // 任务分配
          const taskAssignment = message.data as TaskAssignmentEvent;
          // 只处理文字转语音任务，其它任务直接忽略
          if (taskAssignment.taskType !== ONLY_TASK_TYPE) {
            console.warn(`[任务忽略] ${timestamp} - 非TTS任务不处理`, {
              接收任务类型: taskAssignment.taskType,
              仅支持类型: ONLY_TASK_TYPE,
              原始数据: message.data
            });
            return;
          }
          updateAssignedTasks(draft => {
            draft.push({
              taskId: taskAssignment.taskId,
              taskType: ONLY_TASK_TYPE,
              taskName: taskAssignment.taskName,
              inputData: taskAssignment.inputData,
              estimatedDuration: taskAssignment.estimatedDuration,
              startTime: new Date(),
              status: "ASSIGNED"
            });
          });
          callbacksRef.current.onTaskAssigned?.(taskAssignment);

          // 异步执行本地推理
          (async () => {
            const start = performance.now();
            // 将任务状态置为 RUNNING
            updateAssignedTasks(draft => {
              const t = draft.find(x => x.taskId === taskAssignment.taskId);
              if (t) t.status = "RUNNING";
            });
            try {
              // 解析 inputData 为 InferRequest
              let params: InferRequest;
              try {
                params = JSON.parse(taskAssignment.inputData) as InferRequest;
              } catch (e) {
                throw new Error(`inputData 不是有效的JSON: ${String(e)}`);
              }

              const resp = await ttsApi.infer(params);
              const end = performance.now();

              const success = resp && (resp as any).code === 0;
              const resultPayload = {
                rawResponse: resp,
              };

              // 提交任务结果
              submitTaskResult({
                taskId: taskAssignment.taskId,
                resultData: JSON.stringify(resultPayload),
                executionDuration: Math.round(end - start),
                status: success ? "SUCCESS" : "FAILED",
                errorMessage: success ? undefined : (resp as any)?.msg || "infer 失败",
              });

              // 本地状态更新在 submitTaskResult 中已处理
            } catch (err: any) {
              const end = performance.now();
              submitTaskResult({
                taskId: taskAssignment.taskId,
                resultData: JSON.stringify({ error: String(err) }),
                executionDuration: Math.round(end - start),
                status: "FAILED",
                errorMessage: String(err),
              });
            }
          })();
          break;
          
        case 10005: // 任务取消
          const cancellation = message.data as { taskId: number; reason: string };
          updateAssignedTasks(draft => {
            const taskIndex = draft.findIndex(task => task.taskId === cancellation.taskId);
            if (taskIndex !== -1) {
              draft[taskIndex].status = "CANCELLED";
            }
          });
          callbacksRef.current.onTaskCancelled?.(cancellation.taskId, cancellation.reason);
          break;
          
        case 100: // Token失效
          console.warn(`[WebSocket] ${timestamp} - Token失效，需要重新登录`);
          // 不在这里调用disconnect，避免循环依赖
          if (wsRef.current) {
            wsRef.current.close();
          }
          break;
          
        default:
          console.warn(`[WebSocket接收] ${timestamp} - 收到未知志愿计算消息类型: ${message.type}`, message);
      }
    } catch (error) {
      console.error(`[WebSocket解析失败] ${timestamp}`, {
        错误: error,
        原始数据: event.data
      });
    }
  }, [updateAssignedTasks]);

  const connect = useCallback(() => {
    if (token === -1) {
      console.error("无效的token，无法连接WebSocket");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      wsRef.current = new WebSocket(`${WS_URL}?token=${token}`);
      
      wsRef.current.onopen = () => {
        const timestamp = new Date().toISOString();
        console.warn(`[WebSocket连接] ${timestamp} - 志愿计算WebSocket连接成功`, {
          连接地址: `${WS_URL}?token=${token}`,
          连接时间: timestamp
        });
        reconnectAttempts.current = 0;
        startHeartbeat();
      };
      
      wsRef.current.onmessage = handleMessage;
      
      wsRef.current.onclose = (event) => {
        const timestamp = new Date().toISOString();
        console.warn(`[WebSocket断开] ${timestamp} - 志愿计算WebSocket连接关闭`, {
          错误码: event.code,
          原因: event.reason,
          是否正常关闭: event.wasClean,
          断开时间: timestamp
        });
        setIsRegistered(false);
        
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
          heartbeatTimer.current = null;
        }
        
        // 自动重连逻辑
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimer.current = setTimeout(() => {
            const retryTimestamp = new Date().toISOString();
            console.warn(`[WebSocket重连] ${retryTimestamp} - 尝试重连志愿计算WebSocket`, {
              重连次数: `${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}`,
              延迟时间: `${delay}ms`,
              重连时间: retryTimestamp
            });
            connect();
          }, delay);
        } else {
          console.error(`[WebSocket重连失败] ${timestamp} - 达到最大重连次数，停止重连`, {
            最大重连次数: MAX_RECONNECT_ATTEMPTS,
            失败时间: timestamp
          });
        }
      };
      
      wsRef.current.onerror = (error) => {
        const timestamp = new Date().toISOString();
        console.error(`[WebSocket错误] ${timestamp} - 志愿计算WebSocket发生错误`, {
          错误对象: error,
          错误时间: timestamp,
          连接状态: wsRef.current?.readyState
        });
      };
      
    } catch (error) {
      console.error("创建志愿计算WebSocket连接失败:", error);
    }
  }, [token, handleMessage, startHeartbeat]);

  const disconnect = useCallback(() => {
    const timestamp = new Date().toISOString();
    console.warn(`[WebSocket断开] ${timestamp} - 主动断开志愿计算WebSocket连接`, {
      断开时间: timestamp,
      当前状态: wsRef.current?.readyState
    });
    
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    wsRef.current?.close();
    wsRef.current = null;
    setIsRegistered(false);
  }, []);

  // 志愿者管理方法
  const registerVolunteer = useCallback((request: VolunteerRegisterRequest) => {
    const timestamp = new Date().toISOString();
    console.warn(`[志愿者注册] ${timestamp} - 开始注册志愿者`, {
      志愿者名称: request.volunteerName,
      计算能力: [ONLY_TASK_TYPE],
      最大并发任务: request.maxConcurrentTasks,
      注册时间: timestamp
    });
    // 仅注册TTS能力
    const sanitized: VolunteerRegisterRequest = {
      ...request,
      capabilities: [ONLY_TASK_TYPE]
    };
    send({
      type: 10000,
      data: sanitized
    });
    setIsRegistered(true);
    callbacksRef.current.onRegistrationSuccess?.();
  }, [send]);

  const sendHeartbeat = useCallback((heartbeat: VolunteerHeartbeatRequest) => {
    // 这个函数现在主要用于更新本地状态，实际心跳发送在 startHeartbeat 中自动处理
    const timestamp = new Date().toISOString();
    console.warn(`[手动心跳] ${timestamp} - 手动更新心跳信息`, {
      志愿者状态: heartbeat.status,
      当前任务数: heartbeat.currentTasks,
      CPU使用率: `${heartbeat.systemInfo.cpuUsage.toFixed(1)}%`,
      内存使用: `${heartbeat.systemInfo.memoryUsage.toFixed(1)}MB`,
      可用槽位: heartbeat.systemInfo.availableSlots,
      更新时间: timestamp
    });
    
    // 更新本地状态
    setSystemInfo(heartbeat.systemInfo);
    setVolunteerStatus(heartbeat.status);
    
    // 可选择性地立即发送一次心跳（如果已连接且已注册）
    if (isConnected() && isRegistered) {
      send({
        type: 10001,
        data: heartbeat
      });
    }
  }, [send, isConnected, isRegistered]);

  // 任务管理方法
  const requestTasks = useCallback((request: TaskRequestMessage) => {
    const timestamp = new Date().toISOString();
    console.warn(`[请求任务] ${timestamp} - 志愿者请求分配任务`, {
      支持能力: [ONLY_TASK_TYPE],
      最大任务数: request.maxTasks,
      优先级: request.priority,
      请求时间: timestamp
    });
    // 仅请求TTS任务
    const sanitized: TaskRequestMessage = {
      ...request,
      capabilities: [ONLY_TASK_TYPE]
    };
    send({
      type: 10002,
      data: sanitized
    });
  }, [send]);

  const submitTaskResult = useCallback((result: TaskResultSubmission) => {
    const timestamp = new Date().toISOString();
    console.warn(`[提交结果] ${timestamp} - 提交任务计算结果`, {
      任务ID: result.taskId,
      执行状态: result.status,
      执行时长: `${result.executionDuration}ms`,
      错误信息: result.errorMessage || "无",
      结果数据: result.resultData,
      提交时间: timestamp
    });
    
    send({
      type: 10003,
      data: result
    });
    
    // 更新本地任务状态
    updateAssignedTasks(draft => {
      const taskIndex = draft.findIndex(task => task.taskId === result.taskId);
      if (taskIndex !== -1) {
        draft[taskIndex].status = result.status === "SUCCESS" ? "COMPLETED" : "FAILED";
      }
    });
  }, [send, updateAssignedTasks]);

  const cancelTask = useCallback((cancellation: TaskCancellationRequest) => {
    const timestamp = new Date().toISOString();
    console.warn(`[取消任务] ${timestamp} - 志愿者取消任务执行`, {
      任务ID: cancellation.taskId,
      取消原因: cancellation.reason || "用户主动取消",
      取消时间: timestamp
    });
    
    send({
      type: 10005,
      data: cancellation
    });
  }, [send]);

  // 清理副作用
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    isConnected,
    
    registerVolunteer,
    sendHeartbeat,
    
    requestTasks,
    submitTaskResult,
    cancelTask,
    // 本地直接创建并执行 TTS 任务
    async createTtsTask(params) {
      // 生成本地临时 taskId（负数以避免与服务端冲突）
      const taskId = -Math.floor(Math.random() * 1_000_000) - 1;
      const taskName = params.text?.slice(0, 16) || params?.emo_text || "TTS-Local";

      // 记录并置为 ASSIGNED -> RUNNING
      updateAssignedTasks(draft => {
        draft.push({
          taskId,
          taskType: ONLY_TASK_TYPE,
          taskName,
          inputData: JSON.stringify(params),
          startTime: new Date(),
          status: "ASSIGNED",
        });
      });

      // 立即标记为 RUNNING
      updateAssignedTasks(draft => {
        const t = draft.find(x => x.taskId === taskId);
        if (t) t.status = "RUNNING";
      });

      const start = performance.now();
      try {
        const resp = await ttsApi.infer(params);
        const end = performance.now();
        const success = (resp as any)?.code === 0;

        // 提交结果（即便是本地任务，也复用统一提交流程，便于后续统计）
        submitTaskResult({
          taskId,
          resultData: JSON.stringify({ rawResponse: resp }),
          executionDuration: Math.round(end - start),
          status: success ? "SUCCESS" : "FAILED",
          errorMessage: success ? undefined : (resp as any)?.msg || "infer 失败",
        });

        return { taskId, success };
      } catch (err: any) {
        const end = performance.now();
        submitTaskResult({
          taskId,
          resultData: JSON.stringify({ error: String(err) }),
          executionDuration: Math.round(end - start),
          status: "FAILED",
          errorMessage: String(err),
        });
        return { taskId, success: false, error: String(err) };
      }
    },
    
    assignedTasks,
    isRegistered,
    volunteerStatus,
    systemInfo,
    
    // 设置回调的方法
    setCallbacks: setCallbacks,
    onTaskAssigned: callbacksRef.current.onTaskAssigned,
    onTaskCancelled: callbacksRef.current.onTaskCancelled,
    onRegistrationSuccess: callbacksRef.current.onRegistrationSuccess,
    onRegistrationFailure: callbacksRef.current.onRegistrationFailure
  };
}