plugins {
    alias(libs.plugins.android.application)
}

android {
    val webAssetsPointer = rootProject.file("hyped-web-assets.path")
    if (webAssetsPointer.exists()) {
        val generatedAssets = rootProject.file(webAssetsPointer.readText().trim()).canonicalFile
        require(generatedAssets.toPath().startsWith(rootProject.file("app/build/generated/hypedWeb").canonicalFile.toPath()))
        sourceSets.getByName("main").assets.setSrcDirs(listOf(generatedAssets))
    }
    namespace = "com.example.hpgame"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.hpgame"
        minSdk = 24
        targetSdk = 37
        versionCode = 5500
        versionName = "5.5.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            optimization {
                enable = true
                packageScope = setOf("androidx.**", "kotlin.**", "kotlinx.**")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")





    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}
