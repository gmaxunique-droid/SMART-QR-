
package com.example.qrmaster.viewmodel

import android.app.Application
import android.net.Uri
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.qrmaster.data.CloudFile
import com.example.qrmaster.logic.CloudinaryResult
import com.example.qrmaster.logic.CloudinaryService
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.*

class FileViewModel(application: Application) : AndroidViewModel(application) {
    private val auth = FirebaseAuth.getInstance()
    private val db = FirebaseFirestore.getInstance()

    private val _files = MutableStateFlow<List<CloudFile>>(emptyList())
    val files = _files.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()

    var isUploading by mutableStateOf(false)
    var uploadProgress by mutableStateOf(0f)
    var storageUsedMb by mutableStateOf(0.0)

    init {
        CloudinaryService.init(application)
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun fetchFiles() {
        val uid = auth.currentUser?.uid ?: return
        db.collection("users").document(uid).collection("files")
            .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    _errorMessage.value = "Failed to sync file list: ${error.localizedMessage}"
                    return@addSnapshotListener
                }
                val list = snapshot?.toObjects(CloudFile::class.java) ?: emptyList()
                _files.value = list
                storageUsedMb = list.sumOf { it.size }.toDouble() / (1024 * 1024)
            }
    }

    fun uploadToCloudinary(uri: Uri, fileName: String, size: Long) {
        val uid = auth.currentUser?.uid ?: run {
            _errorMessage.value = "Authentication required for upload."
            return
        }

        viewModelScope.launch {
            CloudinaryService.uploadFile(uri).collect { result ->
                when (result) {
                    is CloudinaryResult.Progress -> {
                        isUploading = true
                        uploadProgress = result.percentage
                    }
                    is CloudinaryResult.Success -> {
                        saveMetadata(uid, fileName, size, result.url)
                    }
                    is CloudinaryResult.Error -> {
                        isUploading = false
                        _errorMessage.value = result.message
                    }
                }
            }
        }
    }

    private suspend fun saveMetadata(uid: String, fileName: String, size: Long, url: String) {
        try {
            val doc = db.collection("users").document(uid).collection("files").document()
            val cloudFile = CloudFile(
                id = doc.id,
                name = fileName,
                size = size,
                url = url,
                userId = uid
            )
            doc.set(cloudFile).await()
            resetUploadState()
        } catch (e: Exception) {
            _errorMessage.value = "Failed to sync file metadata: ${e.localizedMessage}"
            resetUploadState()
        }
    }

    private fun resetUploadState() {
        isUploading = false
        uploadProgress = 0f
    }

    fun deleteFile(file: CloudFile) {
        viewModelScope.launch {
            try {
                // Remove from Firestore. Actual Cloudinary deletion requires Admin API (Secret).
                db.collection("users").document(file.userId).collection("files").document(file.id).delete().await()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to delete record: ${e.localizedMessage}"
            }
        }
    }
}
