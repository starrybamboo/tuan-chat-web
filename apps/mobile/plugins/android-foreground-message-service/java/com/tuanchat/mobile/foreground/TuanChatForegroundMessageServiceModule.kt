package com.tuanchat.mobile.foreground

import android.app.ActivityManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
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
      TuanChatForegroundMessageService.jsAppActive = active
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
    TuanChatForegroundMessageService.refreshNotificationState(reactContext)
    val status = WritableNativeMap().apply {
      putBoolean("appActive", TuanChatForegroundMessageService.appActive)
      putBoolean("running", TuanChatForegroundMessageService.running)
      putBoolean("connected", TuanChatForegroundMessageService.connected)
      putBoolean("jsAppActive", TuanChatForegroundMessageService.jsAppActive)
      putString("lastEvent", TuanChatForegroundMessageService.lastEvent)
      putDouble("lastBusinessFrameType", TuanChatForegroundMessageService.lastBusinessFrameType.toDouble())
      putDouble("lastFrameType", TuanChatForegroundMessageService.lastFrameType.toDouble())
      putString("lastSkipReason", TuanChatForegroundMessageService.lastSkipReason)
      putDouble("lastMessageAt", TuanChatForegroundMessageService.lastMessageAt.toDouble())
      putDouble("lastShownNotificationAt", TuanChatForegroundMessageService.lastShownNotificationAt.toDouble())
      putDouble("messageChannelImportance", TuanChatForegroundMessageService.messageChannelImportance.toDouble())
      putBoolean("notificationsEnabled", TuanChatForegroundMessageService.notificationsEnabled)
      putDouble("receivedFrameCount", TuanChatForegroundMessageService.receivedFrameCount.toDouble())
      putDouble("shownNotificationCount", TuanChatForegroundMessageService.shownNotificationCount.toDouble())
    }
    promise.resolve(status)
  }

  @ReactMethod
  fun getBackgroundPushDiagnostics(promise: Promise) {
    val diagnostics = WritableNativeMap().apply {
      putString("brand", Build.BRAND)
      putString("manufacturer", Build.MANUFACTURER)
      putString("model", Build.MODEL)
      putString("packageName", reactContext.packageName)
      putDouble("sdkInt", Build.VERSION.SDK_INT.toDouble())
      putNullableBoolean("backgroundRestricted", readBackgroundRestricted())
      putNullableBoolean("ignoringBatteryOptimizations", readIgnoringBatteryOptimizations())
    }
    promise.resolve(diagnostics)
  }

  @ReactMethod
  fun openBackgroundPushSetting(target: String, promise: Promise) {
    try {
      val opened = when (target) {
        "appDetails" -> openAppDetails()
        "batteryOptimization" -> openBatteryOptimizationSettings()
        "manufacturerBackground" -> openManufacturerBackgroundSettings()
        "notificationSettings" -> openNotificationSettings()
        else -> openAppDetails()
      }
      promise.resolve(opened)
    } catch (error: Exception) {
      promise.reject("E_TUANCHAT_BACKGROUND_SETTING", error)
    }
  }

  private fun readBackgroundRestricted(): Boolean? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
      return null
    }
    val activityManager = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    return activityManager?.isBackgroundRestricted
  }

  private fun readIgnoringBatteryOptimizations(): Boolean? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true
    }
    val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
    return powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName)
  }

  private fun openNotificationSettings(): Boolean {
    val intents = mutableListOf<Intent>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      intents += Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      }
    }
    intents += appDetailsIntent()
    return startFirstAvailable(intents)
  }

  private fun openBatteryOptimizationSettings(): Boolean {
    val intents = mutableListOf<Intent>()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (readIgnoringBatteryOptimizations() == false) {
        intents += Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
        }
      }
      intents += Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
    }
    intents += appDetailsIntent()
    return startFirstAvailable(intents)
  }

  private fun openManufacturerBackgroundSettings(): Boolean {
    val vendor = "${Build.MANUFACTURER} ${Build.BRAND} ${Build.MODEL}".lowercase()
    val intents = when {
      vendor.contains("xiaomi") || vendor.contains("redmi") || vendor.contains("poco") -> xiaomiBackgroundIntents()
      vendor.contains("huawei") || vendor.contains("honor") -> huaweiBackgroundIntents()
      vendor.contains("oppo") || vendor.contains("realme") || vendor.contains("oneplus") -> oppoBackgroundIntents()
      vendor.contains("vivo") || vendor.contains("iqoo") -> vivoBackgroundIntents()
      vendor.contains("samsung") -> samsungBackgroundIntents()
      else -> emptyList()
    }
    return startFirstAvailable(intents + appDetailsIntent())
  }

  private fun openAppDetails(): Boolean {
    return startFirstAvailable(listOf(appDetailsIntent()))
  }

  private fun appDetailsIntent(): Intent {
    return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${reactContext.packageName}")
    }
  }

  private fun xiaomiBackgroundIntents(): List<Intent> {
    return listOf(
      componentIntent("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
      componentIntent("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity").apply {
        putExtra("extra_pkgname", reactContext.packageName)
      },
      componentIntent("com.miui.securitycenter", "com.miui.powercenter.PowerSettings")
    )
  }

  private fun huaweiBackgroundIntents(): List<Intent> {
    return listOf(
      componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
      componentIntent("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")
    )
  }

  private fun oppoBackgroundIntents(): List<Intent> {
    return listOf(
      componentIntent("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
      componentIntent("com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
      componentIntent("com.coloros.oppoguardelf", "com.coloros.powermanager.fuelgaue.PowerUsageModelActivity")
    )
  }

  private fun vivoBackgroundIntents(): List<Intent> {
    return listOf(
      componentIntent("com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.BgStartUpManager"),
      componentIntent("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
    )
  }

  private fun samsungBackgroundIntents(): List<Intent> {
    return listOf(
      componentIntent("com.samsung.android.sm", "com.samsung.android.sm.ui.battery.BatteryActivity"),
      componentIntent("com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity")
    )
  }

  private fun componentIntent(packageName: String, className: String): Intent {
    return Intent().apply {
      component = ComponentName(packageName, className)
      putExtra("package_name", reactContext.packageName)
      putExtra("packageName", reactContext.packageName)
    }
  }

  private fun startFirstAvailable(intents: List<Intent>): Boolean {
    for (intent in intents) {
      if (startActivitySafely(intent)) {
        return true
      }
    }
    return false
  }

  private fun startActivitySafely(intent: Intent): Boolean {
    return try {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      true
    } catch (_: ActivityNotFoundException) {
      false
    } catch (_: SecurityException) {
      false
    }
  }
}

private fun WritableNativeMap.putNullableBoolean(key: String, value: Boolean?) {
  if (value == null) {
    putNull(key)
  } else {
    putBoolean(key, value)
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
