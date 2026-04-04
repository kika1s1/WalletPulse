package com.walletpulsetemp.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class WalletPulseNotificationListenerService : NotificationListenerService() {

    companion object {
        val WATCHED_PACKAGES = listOf(
            "com.payoneer.android",
            "com.grey.android",
            "com.dukascopy.bank"
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn ?: return
        val packageName = notification.packageName ?: return

        if (packageName !in WATCHED_PACKAGES) return

        val extras = notification.notification.extras ?: return
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val body = extras.getCharSequence("android.text")?.toString() ?: ""

        if (title.isBlank() && body.isBlank()) return

        val reactContext = NotificationBridgeModule.reactContext ?: return

        try {
            val params = Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("title", title)
                putString("body", body)
                putDouble("receivedAt", System.currentTimeMillis().toDouble())
            }

            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("onNotificationReceived", params)
        } catch (_: Exception) {
            // Non-critical: JS bridge may not be ready
        }
    }
}
