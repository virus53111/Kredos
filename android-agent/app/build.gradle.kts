plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "io.phonebridge.agent"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.phonebridge.agent"
        minSdk = 31
        targetSdk = 35
        versionCode = 2
        versionName = "0.2.0"

        buildConfigField("String", "API_BASE_URL", "\"https://phonebridge-agent-api.onrender.com\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}
