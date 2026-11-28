package com.example.hpgame

import android.app.Activity
import android.app.AlertDialog
import android.os.Build
import android.os.Bundle
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.webkit.JavascriptInterface
import android.widget.FrameLayout
import android.view.View
import android.webkit.WebView
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONArray

class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var frame: FrameLayout
    private inner class DisplayBridge {
        @JavascriptInterface fun setOrientation(mode: String) {
            if (mode != "portrait" && mode != "landscape") return
            runOnUiThread {
                if (!web.url.orEmpty().startsWith("https://appassets.androidplatform.net/assets/www/")) return@runOnUiThread
                val desired = if (mode == "landscape") ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                if (requestedOrientation != desired) requestedOrientation = desired
            }
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 30) window.setDecorFitsSystemWindows(false)
        else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
        web = WebView(this)
        frame = FrameLayout(this)
        frame.setBackgroundColor(android.graphics.Color.BLACK)
        frame.addView(web, FrameLayout.LayoutParams(-1, -1))
        setContentView(frame)
        frame.setOnApplyWindowInsetsListener { view, insets ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(android.view.WindowInsets.Type.systemBars() or android.view.WindowInsets.Type.displayCutout() or android.view.WindowInsets.Type.mandatorySystemGestures())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            } else {
                @Suppress("DEPRECATION")
                val cutout = if (Build.VERSION.SDK_INT >= 28) insets.displayCutout else null
                view.setPadding(maxOf(insets.systemWindowInsetLeft, cutout?.safeInsetLeft ?: 0), maxOf(insets.systemWindowInsetTop, cutout?.safeInsetTop ?: 0), maxOf(insets.systemWindowInsetRight, cutout?.safeInsetRight ?: 0), maxOf(insets.systemWindowInsetBottom, cutout?.safeInsetBottom ?: 0))
            }
            @Suppress("DEPRECATION")
            if (Build.VERSION.SDK_INT >= 30) android.view.WindowInsets.CONSUMED else insets.consumeSystemWindowInsets()
        }
        frame.requestApplyInsets()
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(DisplayBridge(), "HypedDisplay")
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            val locales = resources.configuration.locales
            val tags = JSONArray((0 until locales.size()).map { locales[it].toLanguageTag() })
            WebViewCompat.addDocumentStartJavaScript(web,
                "window.__HYPED_POT_LOCALES__ = $tags;", setOf("https://appassets.androidplatform.net"))
        }
        WebView.setWebContentsDebuggingEnabled((applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()
        web.webChromeClient = WebChromeClient()
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = loader.shouldInterceptRequest(request.url)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                request.url.scheme != "https" || request.url.host != "appassets.androidplatform.net" || request.url.port !in listOf(-1, 443)
        }
        if (Build.VERSION.SDK_INT >= 33) onBackInvokedDispatcher.registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT) { confirmExit() }
        web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
    }
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        frame.requestApplyInsets()
        // Resize the existing WebView; do not reload JS or recreate game stores.
    }
    private fun pauseGame() { web.evaluateJavascript("window.dispatchEvent(new Event('android-pause'))", null) }
    private fun confirmExit() {
        pauseGame()
        AlertDialog.Builder(this).setMessage("Выйти из игры?")
            .setPositiveButton("Выйти") { _, _ -> finish() }
            .setNegativeButton("Остаться", null).show()
    }
    @Deprecated("Legacy Android back")
    override fun onBackPressed() { confirmExit() }
    override fun onPause() { pauseGame(); web.onPause(); super.onPause() }
    override fun onResume() { super.onResume(); if (::web.isInitialized) web.onResume() }
    override fun onDestroy() { web.destroy(); super.onDestroy() }
}
