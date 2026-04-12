package com.walletpulse.notification

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Arguments

class NotificationBridgeModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        var reactContext: ReactApplicationContext? = null
            private set
    }

    init {
        Companion.reactContext = reactContext
    }

    override fun getName(): String = "NotificationBridge"

    @ReactMethod
    fun isListenerEnabled(promise: Promise) {
        try {
            val cn = ComponentName(
                reactApplicationContext,
                WalletPulseNotificationListenerService::class.java
            )
            val flat = Settings.Secure.getString(
                reactApplicationContext.contentResolver,
                "enabled_notification_listeners"
            )
            val enabled = flat?.contains(cn.flattenToString()) == true
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_LISTENER", e.message)
        }
    }

    @ReactMethod
    fun openListenerSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_OPEN_SETTINGS", e.message)
        }
    }

    @ReactMethod
    fun getWatchedPackages(promise: Promise) {
        val arr = Arguments.createArray()
        WalletPulseNotificationListenerService.WATCHED_PACKAGES.forEach { arr.pushString(it) }
        promise.resolve(arr)
    }
}
