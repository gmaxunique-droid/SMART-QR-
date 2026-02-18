
package com.example.qrmaster

import android.content.ContentValues
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.view.animation.AlphaAnimation
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.example.qrmaster.databinding.ActivityMainBinding
import com.example.qrmaster.logic.QRGenerator
import com.example.qrmaster.logic.QRTypeDetector
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private var currentQrBitmap: Bitmap? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            binding = ActivityMainBinding.inflate(layoutInflater)
            setContentView(binding.root)
            Log.d("SmartQR", "MainActivity UI Loaded Successfully")
            setupUI()
        } catch (e: Exception) {
            Log.e("SmartQR", "Failed to inflate layout", e)
        }
    }

    private fun setupUI() {
        setSupportActionBar(binding.toolbar)
        
        binding.btnGenerate.setOnClickListener {
            val input = binding.etInput.text.toString().trim()
            if (input.isNotEmpty()) {
                generateQR(input)
            } else {
                Toast.makeText(this, "Enter text or link first", Toast.LENGTH_SHORT).show()
            }
        }

        binding.templateWebsite.setOnClickListener { binding.etInput.setText("https://") }
        binding.templateWifi.setOnClickListener { binding.etInput.setText("WIFI:S:MyNetwork;T:WPA;P:Password;;") }
        
        binding.btnShare.setOnClickListener { shareQR() }
        binding.btnSave.setOnClickListener { saveQR() }

        binding.qrContainer.visibility = View.GONE
    }

    private fun generateQR(content: String) {
        lifecycleScope.launch {
            binding.btnGenerate.isEnabled = false
            val type = QRTypeDetector.detect(content)
            val formatted = QRTypeDetector.format(type, content)
            
            val bitmap = withContext(Dispatchers.Default) {
                QRGenerator.generate(formatted)
            }

            if (bitmap != null) {
                currentQrBitmap = bitmap
                binding.ivQrPreview.setImageBitmap(bitmap)
                binding.tvDetectedType.text = "Detected: ${type.label}"
                
                if (binding.qrContainer.visibility != View.VISIBLE) {
                    binding.qrContainer.visibility = View.VISIBLE
                    binding.qrContainer.startAnimation(AlphaAnimation(0f, 1f).apply { duration = 400 })
                }
            } else {
                Toast.makeText(this@MainActivity, "Error generating QR", Toast.LENGTH_SHORT).show()
            }
            binding.btnGenerate.isEnabled = true
        }
    }

    private fun shareQR() {
        val bitmap = currentQrBitmap ?: return
        try {
            val cachePath = File(cacheDir, "images")
            cachePath.mkdirs()
            val file = File(cachePath, "shared_qr.png")
            FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }

            val contentUri = FileProvider.getUriForFile(this, "$packageName.provider", file)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, contentUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(intent, "Share QR Code"))
        } catch (e: Exception) {
            Toast.makeText(this, "Sharing failed", Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveQR() {
        val bitmap = currentQrBitmap ?: return
        val filename = "QR_${System.currentTimeMillis()}.png"
        var fos: OutputStream? = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val values = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES)
                }
                val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                fos = uri?.let { contentResolver.openOutputStream(it) }
            } else {
                val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                val file = File(dir, filename)
                fos = FileOutputStream(file)
            }

            fos?.use {
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)
                Toast.makeText(this, "Saved to Pictures", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Save failed", Toast.LENGTH_SHORT).show()
        }
    }
}
