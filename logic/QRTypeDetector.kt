
package com.example.qrmaster.logic

import com.example.qrmaster.data.QRType

object QRTypeDetector {
    fun detect(input: String): QRType {
        return when {
            input.startsWith("http://") || input.startsWith("https://") -> QRType.URL
            input.contains("@") && input.contains(".") -> QRType.EMAIL
            input.matches(Regex("^\\+?[0-9\\s\\-]{7,15}$")) -> QRType.PHONE
            input.startsWith("WIFI:") -> QRType.WIFI
            input.matches(Regex("^-?\\d+\\.\\d+,\\s?-?\\d+\\.\\d+$")) -> QRType.LOCATION
            else -> QRType.TEXT
        }
    }

    fun format(type: QRType, input: String): String {
        return when (type) {
            QRType.PHONE -> if (input.startsWith("tel:")) input else "tel:${input.replace(" ", "")}"
            QRType.EMAIL -> if (input.startsWith("mailto:")) input else "mailto:$input"
            QRType.LOCATION -> "https://maps.google.com/?q=$input"
            else -> input
        }
    }
}
