
package com.example.qrmaster.ui.screens

import android.Manifest
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.navigation.NavController
import com.example.qrmaster.R
import com.example.qrmaster.logic.QRGenerator
import com.example.qrmaster.logic.QRTypeDetector
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

private val FG_PALETTE = listOf(
    Color.BLACK, 
    Color.parseColor("#6750A4"),
    Color.parseColor("#01579B"),
    Color.parseColor("#1B5E20"),
    Color.parseColor("#BF360C"),
    Color.parseColor("#4A148C"),
    Color.WHITE
)

data class QuickAction(val label: String, val icon: ImageVector, val payload: String = "")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainDashboard(navController: NavController) {
    var textInput by remember { mutableStateOf("") }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var useBrandedLogo by remember { mutableStateOf(true) }
    val haptic = LocalHapticFeedback.current
    
    var selectedFgColor by remember { mutableIntStateOf(Color.BLACK) }
    var selectedBgColor by remember { mutableIntStateOf(Color.WHITE) }

    val context = LocalContext.current
    val type = QRTypeDetector.detect(textInput)
    val scrollState = rememberScrollState()
    
    // Load app icon for QR overlay
    val appLogo = remember(context) {
        try {
            BitmapFactory.decodeResource(context.resources, R.mipmap.ic_launcher)
        } catch (e: Exception) {
            null
        }
    }

    val quickActions = listOf(
        QuickAction("Website", Icons.Default.Language, "https://"),
        QuickAction("WiFi", Icons.Default.Wifi, "WIFI:S:MyNetwork;T:WPA;P:Password;;"),
        QuickAction("Contact", Icons.Default.ContactPage, "BEGIN:VCARD\nFN:Name\nTEL:123\nEND:VCARD"),
        QuickAction("Email", Icons.Default.Email, "mailto:"),
        QuickAction("Call", Icons.Default.Phone, "tel:"),
        QuickAction("Location", Icons.Default.LocationOn, "40.7128,-74.0060")
    )

    LaunchedEffect(selectedFgColor, selectedBgColor, useBrandedLogo) {
        if (qrBitmap != null) {
            qrBitmap = QRGenerator.generate(
                content = QRTypeDetector.format(type, textInput),
                fgColor = selectedFgColor,
                bgColor = selectedBgColor,
                logo = if (useBrandedLogo) appLogo else null
            )
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { 
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(32.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.onSurface
                        ) {
                            Icon(Icons.Default.AutoFixHigh, null, tint = MaterialTheme.colorScheme.surface, modifier = Modifier.padding(6.dp))
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Smart QR Pro", fontWeight = FontWeight.Black, letterSpacing = (-0.5).sp)
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("settings") }) {
                        Icon(Icons.Default.Settings, "Settings")
                    }
                }
            )
        },
        bottomBar = {
            BottomAppBar(
                containerColor = MaterialTheme.colorScheme.surfaceColorAtElevation(3.dp),
                actions = {
                    IconButton(onClick = { 
                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    }) {
                        Icon(Icons.Default.QrCodeScanner, "Scanner")
                    }
                    IconButton(onClick = { navController.navigate("storage") }) {
                        Icon(Icons.Default.CloudUpload, "Cloud")
                    }
                },
                floatingActionButton = {
                    FloatingActionButton(
                        onClick = { 
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            qrBitmap = QRGenerator.generate(
                                content = QRTypeDetector.format(type, textInput),
                                fgColor = selectedFgColor,
                                bgColor = selectedBgColor,
                                logo = if (useBrandedLogo) appLogo else null
                            )
                        },
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    ) {
                        Icon(Icons.Default.AutoFixHigh, "Generate")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(20.dp)
        ) {
            // Main Input Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(32.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f))
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        "Paste or Upload Anything", 
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = textInput,
                        onValueChange = { textInput = it },
                        placeholder = { Text("Enter text, URL, or data...") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = TextFieldDefaults.outlinedTextFieldColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                            focusedBorderColor = MaterialTheme.colorScheme.primary
                        ),
                        trailingIcon = {
                            if (textInput.isNotEmpty()) {
                                IconButton(onClick = { textInput = ""; qrBitmap = null }) {
                                    Icon(Icons.Default.Close, null)
                                }
                            }
                        }
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            "DETECTED: ${type.label}", 
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Appearance Customizer
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(28.dp),
                color = MaterialTheme.colorScheme.surfaceColorAtElevation(2.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Logo Overlay", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black)
                        Switch(
                            checked = useBrandedLogo,
                            onCheckedChange = { 
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                useBrandedLogo = it 
                            },
                            thumbContent = {
                                if (useBrandedLogo) {
                                    Icon(Icons.Default.Check, null, modifier = Modifier.size(SwitchDefaults.IconSize))
                                }
                            }
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("QR Pattern Color", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black)
                    Spacer(modifier = Modifier.height(12.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(FG_PALETTE) { color ->
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(CircleShape)
                                    .background(androidx.compose.ui.graphics.Color(color))
                                    .border(
                                        width = if (selectedFgColor == color) 3.dp else 1.dp,
                                        color = if (selectedFgColor == color) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                                        shape = CircleShape
                                    )
                                    .clickable { 
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        selectedFgColor = color 
                                    }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // QR Result
            AnimatedVisibility(
                visible = qrBitmap != null,
                enter = expandVertically() + fadeIn(),
                exit = shrinkVertically() + fadeOut()
            ) {
                qrBitmap?.let { bitmap ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Card(
                            elevation = CardDefaults.cardElevation(16.dp),
                            shape = RoundedCornerShape(32.dp),
                            colors = CardDefaults.cardColors(containerColor = androidx.compose.ui.graphics.Color(selectedBgColor))
                        ) {
                            Image(
                                bitmap = bitmap.asImageBitmap(),
                                contentDescription = "Generated QR",
                                modifier = Modifier
                                    .size(280.dp)
                                    .padding(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(
                                onClick = { 
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    shareBitmap(context, bitmap)
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Icon(Icons.Default.Share, null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("SHARE")
                            }
                            OutlinedButton(
                                onClick = { 
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    saveBitmapToGallery(context, bitmap)
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                Icon(Icons.Default.Download, null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("SAVE")
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

private fun saveBitmapToGallery(context: Context, bitmap: Bitmap) {
    val filename = "SmartQR_${System.currentTimeMillis()}.png"
    var fos: OutputStream? = null

    try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val contentValues = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SmartQR")
            }
            val imageUri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
            fos = imageUri?.let { context.contentResolver.openOutputStream(it) }
        } else {
            val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES).toString()
            val folder = File(imagesDir, "SmartQR")
            if (!folder.exists()) folder.mkdir()
            val image = File(folder, filename)
            fos = FileOutputStream(image)
        }

        fos?.use {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
            Toast.makeText(context, "Saved to Gallery", Toast.LENGTH_SHORT).show()
        }
    } catch (e: Exception) {
        e.printStackTrace()
        Toast.makeText(context, "Failed to Save", Toast.LENGTH_SHORT).show()
    }
}

private fun shareBitmap(context: Context, bitmap: Bitmap) {
    try {
        val cachePath = File(context.cacheDir, "images")
        cachePath.mkdirs()
        val stream = FileOutputStream("$cachePath/image.png")
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        stream.close()

        val imagePath = File(context.cacheDir, "images")
        val newFile = File(imagePath, "image.png")
        val contentUri = FileProvider.getUriForFile(context, "${context.packageName}.provider", newFile)

        if (contentUri != null) {
            val shareIntent = Intent().apply {
                action = Intent.ACTION_SEND
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                setDataAndType(contentUri, context.contentResolver.getType(contentUri))
                putExtra(Intent.EXTRA_STREAM, contentUri)
                type = "image/png"
            }
            context.startActivity(Intent.createChooser(shareIntent, "Share QR Code"))
        }
    } catch (e: Exception) {
        e.printStackTrace()
        Toast.makeText(context, "Failed to Share", Toast.LENGTH_SHORT).show()
    }
}
