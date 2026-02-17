
package com.example.qrmaster.ui.screens

import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.qrmaster.viewmodel.FileViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StorageScreen(navController: NavController, vm: FileViewModel = viewModel()) {
    val context = LocalContext.current
    val files by vm.files.collectAsState()
    val error by vm.errorMessage.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val pickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        uri?.let {
            try {
                val cursor = context.contentResolver.query(it, null, null, null, null)
                cursor?.use { c ->
                    val nameIndex = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val sizeIndex = c.getColumnIndex(OpenableColumns.SIZE)
                    if (c.moveToFirst()) {
                        val name = c.getString(nameIndex) ?: "file_${System.currentTimeMillis()}"
                        val size = c.getLong(sizeIndex)
                        if (size <= 20 * 1024 * 1024) {
                            vm.uploadToCloudinary(it, name, size)
                        } else {
                            scope.launch { snackbarHostState.showSnackbar("File too large (Max 20MB)") }
                        }
                    }
                }
            } catch (e: Exception) {
                scope.launch { snackbarHostState.showSnackbar("File Access Error: ${e.localizedMessage}") }
            }
        }
    }

    LaunchedEffect(error) {
        error?.let {
            snackbarHostState.showSnackbar(it)
            vm.clearError()
        }
    }

    LaunchedEffect(Unit) { vm.fetchFiles() }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Cloudinary Vault") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { pickerLauncher.launch("*/*") },
                containerColor = MaterialTheme.colorScheme.primaryContainer
            ) {
                Icon(Icons.Default.FileUpload, "Upload to Cloudinary")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            if (vm.isUploading) {
                LinearProgressIndicator(
                    progress = vm.uploadProgress,
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    text = "Uploading... ${ (vm.uploadProgress * 100).toInt() }%",
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    color = MaterialTheme.colorScheme.secondary
                )
            }

            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Storage, null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Cloud Usage", style = MaterialTheme.typography.titleSmall)
                    }
                    Text("${"%.2f".format(vm.storageUsedMb)} MB Tracking", style = MaterialTheme.typography.headlineSmall)
                }
            }

            if (files.isEmpty() && !vm.isUploading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.CloudQueue, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("No files hosted on Cloudinary", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            LazyColumn(modifier = Modifier.weight(1f)) {
                items(files) { file ->
                    ListItem(
                        headlineContent = { Text(file.name) },
                        supportingContent = { Text("${file.size / 1024} KB • Cloudinary CDN") },
                        trailingContent = {
                            Row {
                                IconButton(onClick = { 
                                    navController.previousBackStackEntry?.savedStateHandle?.set("qr_url", file.url)
                                    navController.popBackStack()
                                }) {
                                    Icon(Icons.Default.QrCode, "QR", tint = MaterialTheme.colorScheme.primary)
                                }
                                IconButton(onClick = { vm.deleteFile(file) }) {
                                    Icon(Icons.Default.DeleteOutline, "Remove", tint = MaterialTheme.colorScheme.error)
                                }
                            }
                        },
                        leadingContent = { 
                            val icon = when {
                                file.name.endsWith(".pdf", true) -> Icons.Default.Description
                                file.name.contains(Regex("\\.(jpg|png|jpeg)$", RegexOption.IGNORE_CASE)) -> Icons.Default.Image
                                else -> Icons.Default.InsertDriveFile
                            }
                            Icon(icon, contentDescription = null) 
                        }
                    )
                }
            }
        }
    }
}
