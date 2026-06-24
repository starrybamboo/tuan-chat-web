package com.tuanchat.mobile.foreground

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

class TuanChatForegroundMessageServiceModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TuanChatForegroundMessageService"

  @ReactMethod
  fun start(config: ReadableMap, promise: Promise) {
    try {
      val token = config.getStringOrNull("token")?.trim().orEmpty()
      val wsUrl = config.getStringOrNull("wsUrl")?.trim().orEmpty()
      if (token.isEmpty() || wsUrl.isEmpty()) {
        promise.resolve(false)
        return
      }

      val intent = Intent(reactContext, TuanChatForegroundMessageService::class.java).apply {
        action = TuanChatForegroundMessageService.ACTION_START
        putExtra(TuanChatForegroundMessageService.EXTRA_TOKEN, token)
        putExtra(TuanChatForegroundMessageService.EXTRA_WS_URL, wsUrl)
        putExtra(TuanChatForegroundMessageService.EXTRA_APP_ACTIVE, config.getBooleanOrDefault("appActive", true))
        config.getLongOrNull("userId")?.let { putExtra(TuanChatForegroundMessageService.EXTRA_USER_ID, it) }
        config.getStringOrNull("username")?.let { putExtra(TuanChatForegroundMessageService.EXTRA_USERNAME, it) }
      }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        reactContext.startForegroundService(intent)
      } else {
        reactContext.startService(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_TUANCHAT_FG_SERVICE_START", error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      if (!TuanChatForegroundMessageService.running) {
        TuanChatForegroundMessageService.clearPersistedConfig(reactContext)
        promise.resolve(false)
        return
      }

      reactContext.startService(Intent(reactContext, TuanChatForegroundMessageService::class.java).apply {
        action = TuanChatForegroundMessageService.ACTION_STOP
      })
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_TUANCHAT_FG_SERVICE_STOP", error)
    }
  }

  @ReactMethod
  fun setAppActive(active: Boolean, promise: Promise) {
    try {
      TuanChatForegroundMessageService.appActive = active
      if (!TuanChatForegroundMessageService.running) {
        promise.resolve(false)
        return
      }

      reactContext.startService(Intent(reactContext, TuanChatForegroundMessageService::class.java).apply {
        action = TuanChatForegroundMessageService.ACTION_SET_APP_ACTIVE
        putExtra(TuanChatForegroundMessageService.EXTRA_APP_ACTIVE, active)
      })
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("E_TUANCHAT_FG_SERVICE_APP_ACTIVE", error)
    }
  }

  @ReactMethod
  fun getStatus(promise: Promise) {
    val status = WritableNativeMap().apply {
      putBoolean("running", TuanChatForegroundMessageService.running)
      putBoolean("connected", TuanChatForegroundMessageService.connected)
      putString("lastEvent", TuanChatForegroundMessageService.lastEvent)
      putDouble("lastMessageAt", TuanChatForegroundMessageService.lastMessageAt.toDouble())
    }
    promise.resolve(status)
  }
}

private fun ReadableMap.getStringOrNull(key: String): String? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }
  return getString(key)
}

private fun ReadableMap.getBooleanOrDefault(key: String, defaultValue: Boolean): Boolean {
  if (!hasKey(key) || isNull(key)) {
    return defaultValue
  }
  return getBoolean(key)
}

private fun ReadableMap.getLongOrNull(key: String): Long? {
  if (!hasKey(key) || isNull(key)) {
    return null
  }
  return getDouble(key).toLong()
}
