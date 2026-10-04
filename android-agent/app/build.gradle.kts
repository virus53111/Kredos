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
        versionCode = 7
        versionName = "0.5.2"

        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"https://phonebridge-agent-api.onrender.com\""
        )
    }

    signingConfigs {
        create("phonebridge") {
            storeFile = file("../phonebridge-test.jks")
            storePassword = "phonebridge-test-2026"
            keyAlias = "phonebridge"
            keyPassword = "phonebridge-test-2026"
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("phonebridge")
        }
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

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
