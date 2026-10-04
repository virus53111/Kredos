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
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "API_BASE_URL", "\"https://phonebridge-zfvppo.v2.appdeploy.ai\"")
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
