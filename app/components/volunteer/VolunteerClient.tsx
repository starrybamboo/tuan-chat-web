/* eslint-disable perfectionist/sort-imports */
import type {
  TaskAssignmentEvent,
  TaskResultSubmission,
  VolunteerRegisterRequest,
} from "../../../api/wsModels";
import { useVolunteerWebSocket } from "../../../api/useVolunteerWebSocket";
import { tuanchat } from "../../../api/instance";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

export default function VolunteerClient() {
  const volunteerWs = useVolunteerWebSocket();
  // 是否存在进行中的任务（ASSIGNED 或 RUNNING）——从任务列表派生
  const isProcessing = useMemo(
    () => volunteerWs.assignedTasks.some(t => t.status === "ASSIGNED" || t.status === "RUNNING"),
    [volunteerWs.assignedTasks],
  );
  const [statusMessage, setStatusMessage] = useState("正在初始化...");
  const [autoRegistered, setAutoRegistered] = useState(false);
  // 是否接收任务（维护与服务器的心跳/连接）
  const [acceptingTasks, setAcceptingTasks] = useState(true);
  const [detectedInfo, setDetectedInfo] = useState({
    volunteerName: "",
    capabilities: [] as string[],
    maxConcurrentTasks: 1,
  });

  const volunteerWsRef = useRef(volunteerWs);

  // 保持ref的最新值
  useEffect(() => {
    volunteerWsRef.current = volunteerWs;
  }, [volunteerWs]);

  // 自动生成志愿者名称
  const generateVolunteerName = useCallback(() => {
    const platform = navigator.platform || "Unknown";
    const userAgent = navigator.userAgent;
    const timestamp = Date.now().toString().slice(-6);

    // 提取浏览器信息
    let browser = "Browser";
    if (userAgent.includes("Chrome"))
      browser = "Chrome";
    else if (userAgent.includes("Firefox"))
      browser = "Firefox";
    else if (userAgent.includes("Safari"))
      browser = "Safari";
    else if (userAgent.includes("Edge"))
      browser = "Edge";

    return `Volunteer-${platform}-${browser}-${timestamp}`;
  }, []);

  // 自动检测计算能力（已改为仅 TEXT_TO_SPEECH）
  const detectCapabilities = useCallback(async () => {
    return ["TEXT_TO_SPEECH"] as string[];
  }, []);

  // 自动注册志愿者
  const autoRegisterVolunteer = useCallback(async () => {
    if (!acceptingTasks || autoRegistered || !volunteerWs.isConnected())
      return;

    try {
      setStatusMessage("正在检测系统能力...");
      const detectedCapabilities = await detectCapabilities();
      const volunteerName = generateVolunteerName();

      setDetectedInfo({
        volunteerName,
        capabilities: detectedCapabilities,
        maxConcurrentTasks: 1,
      });

      setStatusMessage(`正在注册志愿者: ${volunteerName}`);

      const registerRequest: VolunteerRegisterRequest = {
        volunteerName,
        capabilities: detectedCapabilities,
        maxConcurrentTasks: 1, // 默认最大并发数为1
      };

      volunteerWs.registerVolunteer(registerRequest);
      setAutoRegistered(true);
      setStatusMessage(`志愿者注册成功: ${volunteerName}`);
    }
    catch (error) {
      console.error("自动注册失败:", error);
      setStatusMessage("自动注册失败，请检查网络连接");
    }
  }, [volunteerWs, autoRegistered, detectCapabilities, generateVolunteerName, acceptingTasks]);

  // 系统信息模拟
  const [systemInfo, setSystemInfo] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    availableSlots: 1,
  });

  // TTS 任务创建相关状态（测试入口）
  const [ttsText, setTtsText] = useState("你好，这是一个测试。");
  const [creatingLocal, setCreatingLocal] = useState(false);
  // 通过环境变量控制是否展示测试入口：默认展示，设置 VITE_ENABLE_LOCAL_TTS_TEST=false 可关闭
  const enableLocalTtsTest = (import.meta as any).env?.VITE_ENABLE_LOCAL_TTS_TEST !== "false";

  // 统一测试参考音频 URL（不再支持本地上传）
  const TEST_TTS_REF_AUDIO_URL
    = "http://39.103.58.31:9000/avatar/chat/024387165b143f30f5e484400b35079c_616814.wav";

  // 处理任务分配（TTS 任务由 Hook 自动本地执行，这里仅更新状态显示）
  const handleTaskAssigned = useCallback((task: TaskAssignmentEvent) => {
    setStatusMessage(`收到新任务: ${task.taskName}（TTS）`);
  }, []);

  // 根据接收任务开关自动连接/断开
  useEffect(() => {
    if (acceptingTasks) {
      if (!volunteerWs.isConnected()) {
        volunteerWs.connect();
      }
    }
    else {
      if (volunteerWs.isConnected()) {
        volunteerWs.disconnect();
      }
    }
  }, [acceptingTasks, volunteerWs]);

  // 连接成功后自动注册（仅在接收任务时）
  useEffect(() => {
    const isConnected = volunteerWs.isConnected();
    if (acceptingTasks && isConnected && !autoRegistered) {
      autoRegisterVolunteer();
    }
  }, [volunteerWs, autoRegistered, autoRegisterVolunteer, acceptingTasks]);

  // 设置WebSocket回调 - 只在组件挂载时设置一次
  useEffect(() => {
    volunteerWs.setCallbacks({
      onTaskAssigned: handleTaskAssigned,
      onRegistrationSuccess: () => {
        setStatusMessage("志愿者注册成功，等待任务分配...");
      },
      onTaskCompleted: (result: TaskResultSubmission) => {
        try {
          const payload = JSON.parse(result.resultData || "{}");
          const audioUrl: string | undefined = payload?.audio_url;
          if (result.status === "SUCCESS") {
            setStatusMessage(`任务完成（taskId=${result.taskId}）`);
            if (audioUrl) {
              toast.success(`任务完成并已上传音频，URL: ${audioUrl}`);
            }
            else {
              toast.success(`任务完成（taskId=${result.taskId}）`);
            }
          }
          else {
            setStatusMessage(`任务失败（taskId=${result.taskId}）：${result.errorMessage ?? "未知错误"}`);
            toast.error(`任务失败：${result.errorMessage ?? "未知错误"}`);
          }
        }
        catch {
          // 兜底处理
          if (result.status === "SUCCESS") {
            setStatusMessage(`任务完成（taskId=${result.taskId}）`);
            toast.success(`任务完成（taskId=${result.taskId}）`);
          }
          else {
            setStatusMessage(`任务失败（taskId=${result.taskId}）：${result.errorMessage ?? "未知错误"}`);
            toast.error(`任务失败：${result.errorMessage ?? "未知错误"}`);
          }
        }
      },
    });
  }, [volunteerWs, handleTaskAssigned]); // 保留必要的依赖

  // 模拟系统信息更新
  useEffect(() => {
    const interval = setInterval(() => {
      const runningTasksCount = volunteerWsRef.current.assignedTasks.filter(task => task.status === "RUNNING").length;
      setSystemInfo({
        cpuUsage: Math.random() * 100,
        memoryUsage: 512 + Math.random() * 1024,
        availableSlots: Math.max(0, 1 - runningTasksCount), // 固定最大并发数为1
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []); // 现在可以安全地使用空依赖数组

  // 移除副作用设置 isProcessing；改为 useMemo 派生

  // 请求新任务（仅 TTS）
  const requestNewTasks = useCallback(() => {
    if (!volunteerWsRef.current.isRegistered || !detectedInfo.capabilities.length)
      return;

    volunteerWsRef.current.requestTasks({
      capabilities: detectedInfo.capabilities,
      maxTasks: 1, // 固定为1
      priority: 2, // 使用数字类型
    });
  }, [detectedInfo.capabilities]); // 只依赖 detectedInfo.capabilities

  // 定期请求任务（仅在接收任务且已注册时）
  useEffect(() => {
    if (!acceptingTasks || !autoRegistered)
      return;

    const interval = setInterval(() => {
      // 只需要请求新任务，心跳已经自动发送
      const hasActiveTasks = volunteerWsRef.current.assignedTasks.some(
        task => task.status === "RUNNING" || task.status === "ASSIGNED",
      );
      if (!hasActiveTasks) {
        requestNewTasks();
      }
    }, 10000); // 每10秒检查一次是否需要新任务

    return () => clearInterval(interval);
  }, [acceptingTasks, autoRegistered, requestNewTasks]);

  // 接收任务开关处理
  const handleToggleAccepting = useCallback(() => {
    setAcceptingTasks((prev) => {
      const next = !prev;
      if (!next) {
        // 关闭接收任务：断开连接并停止心跳
        if (volunteerWs.isConnected()) {
          volunteerWs.disconnect();
        }
        setAutoRegistered(false);
        setStatusMessage("已暂停接收任务");
      }
      else {
        setStatusMessage("正在恢复接收任务...");
      }
      return next;
    });
  }, [volunteerWs]);

  // 创建分布式 TTS 任务（通过任务创建接口，而非直连本地）
  const handleCreateLocalTts = useCallback(async () => {
    if (!ttsText || !ttsText.trim()) {
      toast.error("请输入要合成的文本");
      return;
    }

    try {
      setCreatingLocal(true);

      // 构造分布式任务创建请求
      const inputPayload = {
        text: ttsText.trim(),
        // 使用固定参考音频 URL 进行测试
        prompt_audio_url: TEST_TTS_REF_AUDIO_URL,
      };
      const taskName = ttsText.trim().slice(0, 16) || "TTS-Task";
      const resp = await tuanchat.distributedTask.createTask({
        taskName,
        taskType: "TEXT_TO_SPEECH",
        inputData: JSON.stringify(inputPayload),
      });

      if (resp.success && typeof resp.data === "number") {
        toast.success(`已创建分布式 TTS 任务（taskId=${resp.data}）`);
        // 若客户端已注册且允许接收任务，主动请求一下任务
        if (acceptingTasks && autoRegistered) {
          requestNewTasks();
        }
      }
      else {
        toast.error(resp.errMsg || "创建任务失败");
      }
    }
    catch (err) {
      console.error(err);
      toast.error("创建分布式 TTS 任务异常");
    }
    finally {
      setCreatingLocal(false);
    }
  }, [ttsText, acceptingTasks, autoRegistered, requestNewTasks]);

  return (
    <div className="p-6 space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">🤖 自动志愿者客户端</h2>

          {/* 连接状态 */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-semibold">连接状态:</span>
              <div className={`badge ${volunteerWs.isConnected() ? "badge-success" : "badge-error"}`}>
                {volunteerWs.isConnected() ? "已连接" : "未连接"}
              </div>
              <div className={`badge ${autoRegistered ? "badge-success" : "badge-warning"}`}>
                {autoRegistered ? "已注册" : "未注册"}
              </div>
              <label className="label cursor-pointer ml-auto">
                <span className="label-text mr-2">接收任务</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={acceptingTasks}
                  onChange={handleToggleAccepting}
                />
              </label>
            </div>
            {volunteerWs.isConnected() && autoRegistered && acceptingTasks && (
              <div className="text-sm text-success flex items-center gap-1">
                <span className="animate-pulse">💓</span>
                <span>心跳自动发送中（每30秒一次）</span>
              </div>
            )}
            {!acceptingTasks && (
              <div className="text-sm text-warning flex items-center gap-1">
                <span>⏸</span>
                <span>已暂停接收任务（不维持心跳）</span>
              </div>
            )}
          </div>

          {/* 自动检测的信息 */}
          {detectedInfo.volunteerName && (
            <div className="bg-base-200 p-4 rounded-lg mb-4">
              <h3 className="font-semibold text-lg mb-2">📋 自动检测信息</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">志愿者名称:</span>
                  {" "}
                  {detectedInfo.volunteerName}
                </div>
                <div>
                  <span className="font-medium">计算能力:</span>
                  {" "}
                  {detectedInfo.capabilities.join(", ")}
                </div>
                <div>
                  <span className="font-medium">最大并发任务:</span>
                  {" "}
                  {detectedInfo.maxConcurrentTasks}
                </div>
              </div>
            </div>
          )}

          {/* 状态消息 */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">状态:</span>
              <span className="text-sm">{statusMessage}</span>
              {isProcessing && <span className="loading loading-spinner loading-sm"></span>}
            </div>
          </div>

          {/* 系统信息 */}
          <div className="bg-base-200 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-lg mb-2">💻 系统监控</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {systemInfo.cpuUsage.toFixed(1)}
                  %
                </div>
                <div className="text-sm text-gray-600">CPU 使用率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {systemInfo.memoryUsage.toFixed(0)}
                  {" "}
                  MB
                </div>
                <div className="text-sm text-gray-600">内存使用</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{systemInfo.availableSlots}</div>
                <div className="text-sm text-gray-600">可用槽位</div>
              </div>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2">
              📝 任务列表 (
              {volunteerWs.assignedTasks.length}
              )
            </h3>
            {volunteerWs.assignedTasks.length === 0
              ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">⏳</div>
                    <div>等待任务分配...</div>
                  </div>
                )
              : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {volunteerWs.assignedTasks.map(task => (
                      <div key={task.taskId} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{task.taskName}</div>
                            <div className="text-sm text-gray-600">
                              类型:
                              {task.taskType}
                            </div>
                            <div className="text-sm text-gray-600">
                              预计耗时:
                              {" "}
                              {task.estimatedDuration}
                              ms
                            </div>
                          </div>
                          <div className={`badge ${
                            task.status === "COMPLETED"
                              ? "badge-success"
                              : task.status === "RUNNING"
                                ? "badge-warning"
                                : task.status === "FAILED"
                                  ? "badge-error"
                                  : task.status === "CANCELLED"
                                    ? "badge-neutral"
                                    : "badge-info"
                          }`}
                          >
                            {task.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </div>

          {/* 手动操作区已移除，改用上方“接收任务”开关控制 */}

          {/* 测试：创建分布式 TTS 任务（可通过 VITE_ENABLE_LOCAL_TTS_TEST 关闭） */}
          {enableLocalTtsTest && (
            <div className="mt-6 p-4 rounded-lg border border-base-300 bg-base-200 space-y-3">
              <h3 className="font-semibold text-lg">🧪 测试：创建 TTS 任务（走分布式任务创建）</h3>
              <p className="text-sm text-warning">该入口通过后端创建任务，随后由志愿者客户端领取并执行。参考音频固定为测试 URL。</p>
              <div className="form-control">
                <label className="label p-0 mb-1">
                  <span className="label-text text-sm text-base-content/70">文本</span>
                </label>
                <textarea
                  className="textarea textarea-bordered"
                  placeholder="请输入要合成的文本"
                  value={ttsText}
                  onChange={e => setTtsText(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-control">
                <label className="label p-0 mb-1">
                  <span className="label-text text-sm text-base-content/70">参考音频</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={TEST_TTS_REF_AUDIO_URL}
                  readOnly
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className={`btn btn-primary ${creatingLocal ? "btn-disabled" : ""}`}
                  onClick={handleCreateLocalTts}
                  disabled={creatingLocal}
                >
                  {creatingLocal ? "创建中..." : "创建分布式 TTS 任务"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
