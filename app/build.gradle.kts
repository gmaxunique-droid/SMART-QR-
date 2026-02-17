
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.example.qrmaster"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.qrmaster"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "2.0"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.1"
    }

    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2023.08.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Cloudinary SDK (Production Ready)
    implementation("com.cloudinary:cloudinary-android:3.0.2")
    
    // Networking
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // QR & Images
    implementation("com.google.zxing:core:3.5.3")
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Firebase (Keeping Auth/Firestore for user metadata if needed, but Storage removed)
    implementation(platform("com.google.firebase:firebase-bom:32.7.1"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
}
