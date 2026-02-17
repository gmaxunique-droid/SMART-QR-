
package com.example.qrmaster.data

import com.google.firebase.Timestamp

data class CloudFile(
    val id: String = "",
    val name: String = "",
    val size: Long = 0,
    val url: String = "",
    val type: String = "",
    val timestamp: Timestamp = Timestamp.now(),
    val userId: String = ""
)

enum class ThemeMode {
    LIGHT, DARK, SYSTEM
}

enum class QRType(val label: String) {
    TEXT("Text"),
    URL("Website"),
    PHONE("Phone"),
    EMAIL("Email"),
    WIFI("WiFi"),
    LOCATION("Location"),
    FILE("Cloud Link")
}
