
package com.example.qrmaster

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.qrmaster.data.ThemeMode
import com.example.qrmaster.ui.screens.*
import com.example.qrmaster.ui.theme.QRTheme
import com.example.qrmaster.viewmodel.SettingsViewModel

class MainActivity : ComponentActivity() {
    private val settingsViewModel: SettingsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val themeMode = settingsViewModel.themeMode
            val darkTheme = when (themeMode) {
                ThemeMode.LIGHT -> false
                ThemeMode.DARK -> true
                ThemeMode.SYSTEM -> isSystemInDarkTheme()
            }

            QRTheme(darkTheme = darkTheme) {
                val navController = rememberNavController()
                
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NavHost(navController = navController, startDestination = "main") {
                        composable("main") { MainDashboard(navController) }
                        composable("storage") { StorageScreen(navController) }
                        composable("settings") { 
                            SettingsScreen(navController, settingsViewModel) 
                        }
                    }
                }
            }
        }
    }
}
