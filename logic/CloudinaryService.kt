
package com.example.qrmaster.logic

import android.content.Context
import android.net.Uri
import com.cloudinary.android.MediaManager
import com.cloudinary.android.callback.ErrorInfo
import com.cloudinary.android.callback.UploadCallback
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/**
 * Result states for Cloudinary upload operations.
 */
sealed class CloudinaryResult {
    data class Progress(val percentage: Float) : CloudinaryResult()
    data class Success(val url: String, val publicId: String) : CloudinaryResult()
    data class Error(val message: String) : CloudinaryResult()
}

/**
 * Production-ready service for handling file uploads to Cloudinary.
 * Uses Unsigned Uploads to ensure the API Secret is never exposed in the client code.
 */
object CloudinaryService {
    // IMPORTANT: Replace these with your actual Cloudinary credentials from the dashboard
    private const val CLOUD_NAME = "your_cloud_name" 
    private const val UPLOAD_PRESET = "your_unsigned_preset"

    private var isInitialized = false

    fun init(context: Context) {
        if (isInitialized) return
        try {
            val config = mapOf(
                "cloud_name" to CLOUD_NAME,
                "secure" to true
            )
            MediaManager.init(context, config)
            isInitialized = true
        } catch (e: Exception) {
            // Initialization might fail if called multiple times or with invalid context
            e.printStackTrace()
        }
    }

    /**
     * Uploads a file from a Uri to Cloudinary.
     * @param uri The local Uri of the file.
     * @return A Flow emitting upload progress and final result.
     */
    fun uploadFile(uri: Uri): Flow<CloudinaryResult> = callbackFlow {
        if (!isInitialized) {
            trySend(CloudinaryResult.Error("Cloudinary not initialized"))
            close()
            return@callbackFlow
        }

        val requestId = MediaManager.get().upload(uri)
            .unsigned(UPLOAD_PRESET)
            .option("resource_type", "auto") // Automatically detects if it's an image, video, or raw file
            .callback(object : UploadCallback {
                override fun onStart(requestId: String) {
                    trySend(CloudinaryResult.Progress(0f))
                }

                override fun onProgress(requestId: String, bytes: Long, totalBytes: Long) {
                    if (totalBytes > 0) {
                        val progress = bytes.toFloat() / totalBytes
                        trySend(CloudinaryResult.Progress(progress))
                    }
                }

                override fun onSuccess(requestId: String, resultData: Map<*, *>) {
                    val url = resultData["secure_url"] as? String ?: resultData["url"] as String
                    val publicId = resultData["public_id"] as? String ?: ""
                    trySend(CloudinaryResult.Success(url, publicId))
                    close()
                }

                override fun onError(requestId: String, error: ErrorInfo) {
                    trySend(CloudinaryResult.Error(error.description ?: "Upload failed"))
                    close()
                }

                override fun onReschedule(requestId: String, error: ErrorInfo) {
                    // Logic for when upload is delayed due to network constraints
                }
            })
            .dispatch()

        awaitClose { 
            // In a real app, you might want to cancel the specific request if the flow is closed
            // MediaManager.get().cancelRequest(requestId) 
        }
    }
}
