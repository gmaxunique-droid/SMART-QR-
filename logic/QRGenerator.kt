
package com.example.qrmaster.logic

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import java.util.*

object QRGenerator {
    /**
     * Generates a QR code bitmap with optional logo overlay.
     */
    fun generate(
        content: String, 
        size: Int = 1024, 
        fgColor: Int = Color.BLACK, 
        bgColor: Int = Color.WHITE,
        logo: Bitmap? = null
    ): Bitmap? {
        return try {
            val hints = EnumMap<EncodeHintType, Any>(EncodeHintType::class.java).apply {
                put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H)
                put(EncodeHintType.CHARACTER_SET, "UTF-8")
                put(EncodeHintType.MARGIN, 1)
            }
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size, hints)
            
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint()

            // Draw Background and Pattern
            for (x in 0 until size) {
                for (y in 0 until size) {
                    paint.color = if (bitMatrix.get(x, y)) fgColor else bgColor
                    canvas.drawPoint(x.toFloat(), y.toFloat(), paint)
                }
            }

            // Overlay Logo
            logo?.let {
                val logoSize = (size * 0.22).toInt()
                val left = (size - logoSize) / 2
                val top = (size - logoSize) / 2
                
                // Draw rounded background for logo
                val padding = 20
                val bgPaint = Paint().apply {
                    color = bgColor
                    isAntiAlias = true
                }
                val rectF = RectF(
                    (left - padding).toFloat(),
                    (top - padding).toFloat(),
                    (left + logoSize + padding).toFloat(),
                    (top + logoSize + padding).toFloat()
                )
                canvas.drawRoundRect(rectF, 40f, 40f, bgPaint)
                
                // Draw logo bitmap
                val destRect = Rect(left, top, left + logoSize, top + logoSize)
                canvas.drawBitmap(it, null, destRect, Paint(Paint.FILTER_BITMAP_FLAG))
            }

            bitmap
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
