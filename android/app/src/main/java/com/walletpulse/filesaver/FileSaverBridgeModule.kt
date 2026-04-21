package com.walletpulse.filesaver

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

/**
 * Exposes Android's Storage Access Framework (ACTION_CREATE_DOCUMENT) so users
 * can choose where to save exported files (PDF, CSV, JSON, backups).
 *
 * Two entry points:
 *  - saveFile: writes raw content (utf8 / base64) to a user-chosen Uri.
 *  - saveFileFromPath: copies an existing local file to a user-chosen Uri.
 *
 * Both resolve to {uri, displayName} on success, null on user cancellation, and
 * reject on hard failure.
 */
class FileSaverBridgeModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQUEST_CREATE_DOCUMENT = 42001
    }

    private sealed class PendingSource {
        data class Content(val data: String, val encoding: String) : PendingSource()
        data class LocalFile(val path: String) : PendingSource()
    }

    private var pendingPromise: Promise? = null
    private var pendingSource: PendingSource? = null

    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity,
            requestCode: Int,
            resultCode: Int,
            data: Intent?,
        ) {
            if (requestCode != REQUEST_CREATE_DOCUMENT) {
                return
            }
            val promise = pendingPromise
            val source = pendingSource
            pendingPromise = null
            pendingSource = null

            if (promise == null) {
                return
            }
            if (resultCode != Activity.RESULT_OK) {
                promise.resolve(null)
                return
            }
            val uri = data?.data
            if (uri == null || source == null) {
                promise.reject("E_NO_URI", "No destination URI returned")
                return
            }

            try {
                writeToUri(uri, source)
                val result = Arguments.createMap()
                result.putString("uri", uri.toString())
                result.putString("displayName", queryDisplayName(uri))
                promise.resolve(result)
            } catch (e: Throwable) {
                promise.reject("E_WRITE", e.message ?: "Write failed", e)
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String = "FileSaverBridge"

    @ReactMethod
    fun saveFile(
        suggestedName: String,
        mimeType: String,
        data: String,
        encoding: String,
        promise: Promise,
    ) {
        launchPicker(
            suggestedName = suggestedName,
            mimeType = mimeType,
            source = PendingSource.Content(data = data, encoding = encoding),
            promise = promise,
        )
    }

    @ReactMethod
    fun saveFileFromPath(
        suggestedName: String,
        mimeType: String,
        sourcePath: String,
        promise: Promise,
    ) {
        launchPicker(
            suggestedName = suggestedName,
            mimeType = mimeType,
            source = PendingSource.LocalFile(path = sourcePath),
            promise = promise,
        )
    }

    private fun launchPicker(
        suggestedName: String,
        mimeType: String,
        source: PendingSource,
        promise: Promise,
    ) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No active activity to present the picker")
            return
        }
        if (pendingPromise != null) {
            promise.reject("E_BUSY", "Another save is already in progress")
            return
        }

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType.ifBlank { "application/octet-stream" }
            putExtra(Intent.EXTRA_TITLE, suggestedName)
        }

        pendingPromise = promise
        pendingSource = source

        try {
            activity.startActivityForResult(intent, REQUEST_CREATE_DOCUMENT)
        } catch (e: Throwable) {
            pendingPromise = null
            pendingSource = null
            promise.reject("E_LAUNCH", e.message ?: "Could not launch file picker", e)
        }
    }

    private fun writeToUri(uri: Uri, source: PendingSource) {
        val resolver = reactContext.contentResolver
        val out = resolver.openOutputStream(uri, "w")
            ?: throw IllegalStateException("Could not open destination for writing")

        out.use { stream ->
            when (source) {
                is PendingSource.Content -> {
                    val bytes = when (source.encoding.lowercase()) {
                        "base64" -> Base64.decode(source.data, Base64.DEFAULT)
                        "utf8", "utf-8", "" -> source.data.toByteArray(Charsets.UTF_8)
                        else -> throw IllegalArgumentException("Unsupported encoding: ${source.encoding}")
                    }
                    stream.write(bytes)
                }
                is PendingSource.LocalFile -> {
                    val file = File(source.path)
                    if (!file.exists()) {
                        throw IllegalStateException("Source file does not exist: ${source.path}")
                    }
                    FileInputStream(file).use { input ->
                        val buffer = ByteArray(16 * 1024)
                        while (true) {
                            val read = input.read(buffer)
                            if (read <= 0) {
                                break
                            }
                            stream.write(buffer, 0, read)
                        }
                    }
                }
            }
            stream.flush()
        }
    }

    private fun queryDisplayName(uri: Uri): String? {
        return try {
            reactContext.contentResolver.query(
                uri,
                arrayOf(OpenableColumns.DISPLAY_NAME),
                null,
                null,
                null,
            )?.use { cursor ->
                if (cursor.moveToFirst()) cursor.getString(0) else null
            }
        } catch (_: Throwable) {
            null
        }
    }
}
