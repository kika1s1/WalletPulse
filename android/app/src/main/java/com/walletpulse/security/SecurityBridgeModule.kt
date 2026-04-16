package com.walletpulse.security

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes Android's FLAG_SECURE to JavaScript. When enabled, the OS prevents
 * screenshots and blurs the app preview in the task switcher.
 */
class SecurityBridgeModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SecurityBridge"

    @ReactMethod
    fun setScreenshotProtection(enabled: Boolean) {
        val activity = reactApplicationContext.currentActivity ?: return
        activity.runOnUiThread {
            try {
                if (enabled) {
                    activity.window.setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE,
                    )
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
            } catch (_: Throwable) {
                // Flag manipulation can fail on exotic OEM builds; silent no-op.
            }
        }
    }
}
