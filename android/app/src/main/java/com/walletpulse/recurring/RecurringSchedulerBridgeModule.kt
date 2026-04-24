package com.walletpulse.recurring

import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.TimeUnit

/**
 * JS-callable bridge for scheduling / cancelling the periodic recurring
 * WorkManager job. JS controls the cadence (so it can be feature-flagged
 * or changed without redeploying the APK).
 *
 * WorkManager's minimum periodic interval is 15 minutes — values smaller
 * than that are silently clamped by the framework.
 */
class RecurringSchedulerBridgeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "RecurringSchedulerBridge"

    @ReactMethod
    fun enqueuePeriodic(intervalMinutes: Double, promise: Promise) {
        try {
            val minutes = intervalMinutes.toLong().coerceAtLeast(15L)
            val request = PeriodicWorkRequestBuilder<RecurringWorker>(
                minutes,
                TimeUnit.MINUTES,
            ).build()

            WorkManager.getInstance(reactApplicationContext).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                // KEEP — the first scheduling wins. On a fresh install we
                // enqueue once; subsequent app starts are no-ops, which
                // keeps the WorkManager-tracked nextRunTime stable.
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("RECURRING_ENQUEUE_FAILED", t)
        }
    }

    @ReactMethod
    fun cancel(promise: Promise) {
        try {
            WorkManager.getInstance(reactApplicationContext)
                .cancelUniqueWork(UNIQUE_WORK_NAME)
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("RECURRING_CANCEL_FAILED", t)
        }
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "wp-recurring"
    }
}
