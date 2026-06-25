package com.tuanchat.mobile.foreground

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.tuanchat.mobile.MainActivity
import com.tuanchat.mobile.R
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.min
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONArray
import org.json.JSONObject

class TuanChatForegroundMessageService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val client by lazy {
    OkHttpClient.Builder()
      .pingInterval(25, TimeUnit.SECONDS)
      .build()
  }
  private var config: ServiceConfig? = null
  private var reconnectAttempt = 0
  private var webSocket: WebSocket? = null
  private var shouldRun = false

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    trace("fg-ws.service.create")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        trace("fg-ws.service.stop-action")
        stopForegroundService()
        return START_NOT_STICKY
      }
      ACTION_SET_APP_ACTIVE -> {
        appActive = intent.getBooleanExtra(EXTRA_APP_ACTIVE, appActive)
        trace("fg-ws.app-active", "active=$appActive")
        if (!shouldRun) {
          stopSelf(startId)
        }
        return if (shouldRun) START_STICKY else START_NOT_STICKY
      }
      ACTION_START -> {
        val nextConfig = ServiceConfig.fromIntent(intent) ?: ServiceConfig.fromPrefs(this)
        if (nextConfig == null) {
          trace("fg-ws.service.start-missing-config")
          stopForegroundService()
          return START_NOT_STICKY
        }

        nextConfig.persist(this)
        config = nextConfig
        appActive = intent.getBooleanExtra(EXTRA_APP_ACTIVE, appActive)
        shouldRun = true
        running = true
        recordEvent("fg-ws.service.start")
        startAsForeground("正在连接消息通道")
        connect()
        return START_STICKY
      }
      else -> {
        val restoredConfig = ServiceConfig.fromPrefs(this)
        if (restoredConfig == null) {
          return START_NOT_STICKY
        }

        config = restoredConfig
        shouldRun = true
        running = true
        recordEvent("fg-ws.service.restart")
        startAsForeground("正在恢复消息通道")
        connect()
        return START_STICKY
      }
    }
  }

  override fun onDestroy() {
    trace("fg-ws.service.destroy")
    shouldRun = false
    running = false
    connected = false
    handler.removeCallbacksAndMessages(null)
    webSocket?.close(1000, "service destroyed")
    webSocket = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun connect() {
    val currentConfig = config ?: return
    if (!shouldRun) {
      return
    }
    if (webSocket != null) {
      return
    }

    recordEvent("fg-ws.connect.start")
    trace("fg-ws.connect.start", "userId=${currentConfig.userId ?: "null"}")
    val request = Request.Builder().url(currentConfig.wsUrl).build()
    webSocket = client.newWebSocket(request, object : WebSocketListener() {
      override fun onOpen(webSocket: WebSocket, response: Response) {
        reconnectAttempt = 0
        connected = true
        recordEvent("fg-ws.open")
        startHeartbeat()
        startWatchdog()
        updateServiceNotification("消息通道已连接")
      }

      override fun onMessage(webSocket: WebSocket, text: String) {
        lastMessageAt = System.currentTimeMillis()
        handleIncomingFrame(text)
      }

      override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
        this@TuanChatForegroundMessageService.webSocket = null
        connected = false
        recordEvent("fg-ws.close")
        trace("fg-ws.close", "code=$code reason=$reason")
        scheduleReconnect()
      }

      override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        this@TuanChatForegroundMessageService.webSocket = null
        connected = false
        recordEvent("fg-ws.error")
        trace("fg-ws.error", "message=${t.message ?: t.javaClass.simpleName}")
        scheduleReconnect()
      }
    })
  }

  private fun startHeartbeat() {
    handler.removeCallbacks(heartbeatRunnable)
    handler.postDelayed(heartbeatRunnable, HEARTBEAT_INTERVAL_MS)
  }

  private fun startWatchdog() {
    handler.removeCallbacks(watchdogRunnable)
    handler.postDelayed(watchdogRunnable, WATCHDOG_INTERVAL_MS)
  }

  private val heartbeatRunnable = object : Runnable {
    override fun run() {
      if (!shouldRun) {
        return
      }
      val sent = webSocket?.send("""{"type":2}""") == true
      trace("fg-ws.heartbeat.send", "sent=$sent connected=$connected")
      handler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
    }
  }

  private val watchdogRunnable = object : Runnable {
    override fun run() {
      if (!shouldRun) {
        return
      }
      val last = lastMessageAt
      val staleMs = if (last > 0L) System.currentTimeMillis() - last else 0L
      if (connected && last > 0L && staleMs > CONNECTION_STALE_TIMEOUT_MS) {
        trace("fg-ws.watchdog.stale", "staleMs=$staleMs")
        reconnectNow("watchdog-stale")
        return
      }
      handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
    }
  }

  private fun reconnectNow(reason: String) {
    trace("fg-ws.reconnect.now", "reason=$reason")
    handler.removeCallbacks(heartbeatRunnable)
    handler.removeCallbacks(watchdogRunnable)
    webSocket?.close(1001, reason)
    webSocket = null
    connected = false
    scheduleReconnect()
  }

  private fun scheduleReconnect() {
    if (!shouldRun) {
      return
    }
    handler.removeCallbacks(reconnectRunnable)
    val delay = min(30_000L, 1_000L * (1L shl min(reconnectAttempt, 5)))
    reconnectAttempt += 1
    updateServiceNotification("消息通道重连中")
    trace("fg-ws.reconnect.schedule", "attempt=$reconnectAttempt delay=$delay")
    handler.postDelayed(reconnectRunnable, delay)
  }

  private val reconnectRunnable = Runnable {
    if (shouldRun) {
      connect()
    }
  }

  private fun handleIncomingFrame(text: String) {
    val root = runCatching { JSONObject(text) }.getOrNull()
    if (root == null) {
      trace("fg-ws.message.invalid-json", "rawLength=${text.length}")
      return
    }

    val type = root.optInt("type", -1)
    trace("fg-ws.message", "type=$type rawLength=${text.length} appActive=$appActive")
    when (type) {
      DIRECT_MESSAGE_PUSH_TYPE -> handleDirectMessage(root.optJSONObject("data"))
      GROUP_MESSAGE_PUSH_TYPE -> handleRoomMessage(root.optJSONObject("data")?.optJSONObject("message"))
      GROUP_MESSAGE_BATCH_PUSH_TYPE -> handleRoomMessageBatch(root.optJSONArray("data"))
      USER_NOTIFICATION_PUSH_TYPE -> handleUserNotification(root.optJSONObject("data"))
      HEARTBEAT_PUSH_TYPE -> recordEvent("fg-ws.heartbeat.pong")
    }
  }

  private fun handleDirectMessage(data: JSONObject?) {
    if (data == null) {
      trace("fg-ws.dm.skip-empty")
      return
    }

    val messageId = data.optLongOrNull("messageId")
    val messageType = data.optInt("messageType", 0)
    val status = data.optInt("status", 0)
    val senderId = data.optLongOrNull("senderId")
    val receiverId = data.optLongOrNull("receiverId")
    val currentUserId = config?.userId
    val content = data.optCleanString("content")
    recordEvent("fg-ws.dm.received")
    trace(
      "fg-ws.dm.received",
      "messageId=${messageId ?: "null"} senderId=${senderId ?: "null"} receiverId=${receiverId ?: "null"} appActive=$appActive content=${content?.take(80) ?: "null"}"
    )

    if (appActive) {
      trace("fg-ws.dm.skip-active", "messageId=${messageId ?: "null"}")
      return
    }
    if (messageType == READ_LINE_MESSAGE_TYPE || status == DELETED_MESSAGE_STATUS) {
      trace("fg-ws.dm.skip-state", "messageId=${messageId ?: "null"} messageType=$messageType status=$status")
      return
    }
    if (currentUserId != null && senderId == currentUserId) {
      trace("fg-ws.dm.skip-self", "messageId=${messageId ?: "null"}")
      return
    }

    val senderName = data.optCleanString("senderUsername")
      ?: senderId?.let { "用户 #$it" }
      ?: "私聊消息"
    val body = resolveMessageBody(messageType, content)
    val contactId = if (currentUserId != null && senderId == currentUserId) receiverId else senderId
    showMessageNotification(
      notificationKey = "dm:${messageId ?: data.optCleanString("syncId") ?: System.currentTimeMillis()}",
      title = senderName,
      body = body,
      deepLink = contactId?.let { "tuanchat://chat/private/$it" } ?: "tuanchat://chat"
    )
  }

  private fun handleRoomMessage(message: JSONObject?) {
    if (message == null) {
      trace("fg-ws.room.skip-empty")
      return
    }
    val messageId = message.optLongOrNull("messageId")
    val roomId = message.optLongOrNull("roomId")
    val currentUserId = config?.userId
    val senderId = message.optLongOrNull("userId")
    val messageType = message.optInt("messageType", 0)
    val status = message.optInt("status", 0)
    val content = message.optCleanString("content")
    recordEvent("fg-ws.room.received")
    trace(
      "fg-ws.room.received",
      "messageId=${messageId ?: "null"} roomId=${roomId ?: "null"} senderId=${senderId ?: "null"} appActive=$appActive"
    )

    if (
      appActive
      || messageType == READ_LINE_MESSAGE_TYPE
      || status == DELETED_MESSAGE_STATUS
      || (currentUserId != null && senderId == currentUserId)
    ) {
      return
    }

    val speaker = message.optCleanString("customRoleName")
      ?: senderId?.let { "用户 #$it" }
    val body = listOfNotNull(speaker, resolveMessageBody(messageType, content))
      .joinToString(": ")
    showMessageNotification(
      notificationKey = "room:${roomId ?: "unknown"}:${messageId ?: System.currentTimeMillis()}",
      title = "群聊消息",
      body = body,
      deepLink = roomId?.let { "tuanchat://chat/room/$it" } ?: "tuanchat://chat"
    )
  }

  private fun handleRoomMessageBatch(items: JSONArray?) {
    if (items == null || items.length() == 0) {
      return
    }
    for (index in 0 until items.length()) {
      handleRoomMessage(items.optJSONObject(index)?.optJSONObject("message"))
    }
  }

  private fun handleUserNotification(data: JSONObject?) {
    if (data == null || appActive) {
      return
    }
    val title = data.optCleanString("title") ?: "团剧通知"
    val body = data.optCleanString("content") ?: title
    val targetPath = data.optCleanString("targetPath")
    recordEvent("fg-ws.system.received")
    trace("fg-ws.system.received", "notificationId=${data.optLongOrNull("notificationId") ?: "null"}")
    showMessageNotification(
      notificationKey = "system:${data.optLongOrNull("notificationId") ?: System.currentTimeMillis()}",
      title = title,
      body = body,
      deepLink = targetPath?.let { toDeepLink(it) } ?: "tuanchat://notifications"
    )
  }

  private fun toDeepLink(targetPath: String): String {
    return "tuanchat://${targetPath.trim().removePrefix("/")}"
  }

  private fun resolveMessageBody(messageType: Int, content: String?): String {
    val text = content?.takeIf { it.isNotBlank() }
    return when (messageType) {
      2 -> text ?: "[图片]"
      3 -> text ?: "[文件]"
      7 -> text ?: "[语音]"
      14 -> text ?: "[视频]"
      else -> text ?: "你收到一条新消息"
    }
  }

  private fun showMessageNotification(notificationKey: String, title: String, body: String, deepLink: String) {
    val manager = getSystemService(NotificationManager::class.java)
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink), this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this,
      notificationKey.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(this, MESSAGE_CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_tuanchat_notification)
      .setContentTitle(title)
      .setContentText(body)
      .setStyle(NotificationCompat.BigTextStyle().bigText(body))
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setShowWhen(true)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
      .build()
    val notificationId = abs(notificationKey.hashCode())
    manager.notify(notificationId, notification)
    trace("fg-ws.notification.show", "key=$notificationKey deepLink=$deepLink")
  }

  private fun startAsForeground(text: String) {
    val notification = buildServiceNotification(text)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(SERVICE_NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
      startForeground(SERVICE_NOTIFICATION_ID, notification)
    }
  }

  private fun updateServiceNotification(text: String) {
    getSystemService(NotificationManager::class.java)
      .notify(SERVICE_NOTIFICATION_ID, buildServiceNotification(text))
  }

  private fun buildServiceNotification(text: String): Notification {
    val intent = Intent(this, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    val pendingIntent = PendingIntent.getActivity(
      this,
      SERVICE_NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_tuanchat_notification)
      .setContentTitle("团剧共创在线中")
      .setContentText(text)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .setShowWhen(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(
      NotificationChannel(SERVICE_CHANNEL_ID, "后台在线服务", NotificationManager.IMPORTANCE_LOW).apply {
        description = "保持团剧共创消息通道在线"
        setShowBadge(false)
      }
    )
    manager.createNotificationChannel(
      NotificationChannel(MESSAGE_CHANNEL_ID, "消息通知", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "私聊与群聊消息提醒"
        enableVibration(true)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
    )
  }

  private fun stopForegroundService() {
    shouldRun = false
    running = false
    connected = false
    handler.removeCallbacksAndMessages(null)
    webSocket?.close(1000, "service stopped")
    webSocket = null
    getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun recordEvent(event: String) {
    lastEvent = event
    trace(event)
  }

  private fun trace(event: String, detail: String? = null) {
    if (detail == null) {
      Log.i(LOG_TAG, "[mobile-notify-chain] $event")
    } else {
      Log.i(LOG_TAG, "[mobile-notify-chain] $event $detail")
    }
  }

  private data class ServiceConfig(
    val token: String,
    val wsUrl: String,
    val userId: Long?,
    val username: String?
  ) {
    fun persist(context: Context) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        .putString(PREF_TOKEN, token)
        .putString(PREF_WS_URL, wsUrl)
        .putLong(PREF_USER_ID, userId ?: 0L)
        .putString(PREF_USERNAME, username)
        .apply()
    }

    companion object {
      fun fromIntent(intent: Intent): ServiceConfig? {
        val token = intent.getStringExtra(EXTRA_TOKEN)?.trim().orEmpty()
        val wsUrl = intent.getStringExtra(EXTRA_WS_URL)?.trim().orEmpty()
        if (token.isEmpty() || wsUrl.isEmpty()) {
          return null
        }
        val rawUserId = intent.getLongExtra(EXTRA_USER_ID, 0L)
        return ServiceConfig(
          token = token,
          wsUrl = wsUrl,
          userId = rawUserId.takeIf { it > 0L },
          username = intent.getStringExtra(EXTRA_USERNAME)?.takeIf { it.isNotBlank() }
        )
      }

      fun fromPrefs(context: Context): ServiceConfig? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val token = prefs.getString(PREF_TOKEN, null)?.trim().orEmpty()
        val wsUrl = prefs.getString(PREF_WS_URL, null)?.trim().orEmpty()
        if (token.isEmpty() || wsUrl.isEmpty()) {
          return null
        }
        val rawUserId = prefs.getLong(PREF_USER_ID, 0L)
        return ServiceConfig(
          token = token,
          wsUrl = wsUrl,
          userId = rawUserId.takeIf { it > 0L },
          username = prefs.getString(PREF_USERNAME, null)?.takeIf { it.isNotBlank() }
        )
      }
    }
  }

  companion object {
    const val ACTION_START = "com.tuanchat.mobile.foreground.START"
    const val ACTION_STOP = "com.tuanchat.mobile.foreground.STOP"
    const val ACTION_SET_APP_ACTIVE = "com.tuanchat.mobile.foreground.SET_APP_ACTIVE"
    const val EXTRA_TOKEN = "token"
    const val EXTRA_WS_URL = "wsUrl"
    const val EXTRA_USER_ID = "userId"
    const val EXTRA_USERNAME = "username"
    const val EXTRA_APP_ACTIVE = "appActive"

    @Volatile var running = false
    @Volatile var connected = false
    @Volatile var appActive = true
    @Volatile var lastEvent = "idle"
    @Volatile var lastMessageAt = 0L

    fun clearPersistedConfig(context: Context) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
    }

    private const val LOG_TAG = "TuanChatFgWs"
    private const val PREFS_NAME = "tuanchat_foreground_message_service"
    private const val PREF_TOKEN = "token"
    private const val PREF_WS_URL = "wsUrl"
    private const val PREF_USER_ID = "userId"
    private const val PREF_USERNAME = "username"
    private const val SERVICE_CHANNEL_ID = "tuanchat-mobile-online-service"
    private const val MESSAGE_CHANNEL_ID = "tuanchat-mobile-chat"
    private const val SERVICE_NOTIFICATION_ID = 91001
    private const val DIRECT_MESSAGE_PUSH_TYPE = 1
    private const val HEARTBEAT_PUSH_TYPE = 2
    private const val GROUP_MESSAGE_PUSH_TYPE = 4
    private const val USER_NOTIFICATION_PUSH_TYPE = 23
    private const val GROUP_MESSAGE_BATCH_PUSH_TYPE = 25
    private const val READ_LINE_MESSAGE_TYPE = 10000
    private const val DELETED_MESSAGE_STATUS = 1
    private const val HEARTBEAT_INTERVAL_MS = 25_000L
    private const val WATCHDOG_INTERVAL_MS = 10_000L
    private const val CONNECTION_STALE_TIMEOUT_MS = 60_000L
  }
}

private fun JSONObject.optCleanString(key: String): String? {
  val value = optString(key, "").trim()
  return value.takeIf { it.isNotEmpty() && it != "null" }
}

private fun JSONObject.optLongOrNull(key: String): Long? {
  if (!has(key) || isNull(key)) {
    return null
  }
  return runCatching { getLong(key) }.getOrNull()?.takeIf { it > 0L }
}
