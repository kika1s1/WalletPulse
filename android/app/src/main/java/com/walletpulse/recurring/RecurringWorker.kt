package com.walletpulse.recurring

import android.content.Context
import android.content.Intent
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Periodic WorkManager worker that wakes the app and runs the recurring
 * scheduler in JavaScript via a Headless JS task. The actual logic lives
 * in src/infrastructure/recurring/headless-task.ts.
 *
 * WorkManager guarantees execution even when the app is killed and
 * survives device reboots (when paired with `RECEIVE_BOOT_COMPLETED`,
 * which the manifest already declares). Minimum periodic interval is
 * 15 minutes — caller picks the actual cadence.
 */
class RecurringWorker(
    context: Context,
    params: WorkerParameters,
) : Worker(context, params) {

    override fun doWork(): Result {
        return try {
            val ctx = applicationContext
            val intent = Intent(ctx, RecurringHeadlessTaskService::class.java)
            ctx.startService(intent)
            // Without this, the JS runtime may be torn down before the
            // task finishes on some OEM builds that are aggressive with
            // background services.
            HeadlessJsTaskService.acquireWakeLockNow(ctx)
            Result.success()
        } catch (t: Throwable) {
            // RETRY surfaces in WorkManager's exponential backoff; safe
            // because the JS scheduler is idempotent (advances nextDueDate
            // only after createTransaction succeeds).
            Result.retry()
        }
    }
}

/**
 * Headless JS service host. React Native's HeadlessJsTaskService spins up
 * a JS context, runs the registered task, and tears down when the
 * returned Promise resolves.
 */
class RecurringHeadlessTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? =
        HeadlessJsTaskConfig(
            "RecurringSchedulerTask",
            Arguments.createMap(),
            // 5 minutes — generous so the JS scheduler can finish even
            // when many catch-up periods need processing in one run.
            5 * 60 * 1000L,
            true,
        )
}
