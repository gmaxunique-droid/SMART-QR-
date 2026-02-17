
# Android Studio Setup Guide

### 1. Project Initialization
- Open Android Studio -> New Project -> Empty Views Activity.
- Language: **Kotlin**.
- Min SDK: **24**.

### 2. Firebase Integration
- Go to [Firebase Console](https://console.firebase.google.com/).
- Add a new Android App.
- Download `google-services.json` and place it in the `app/` folder.
- Enable **Firebase Storage** in the console.

### 3. Dependencies
Add these to your `build.gradle.kts` (Module: app):
```kotlin
dependencies {
    // Firebase
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-storage-ktx")
    
    // QR Code
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
}
```

### 4. Build APK
- Go to `Build` -> `Build Bundle(s) / APK(s)` -> `Build APK(s)`.
- The file will be in `app/build/outputs/apk/debug/app-debug.apk`.
