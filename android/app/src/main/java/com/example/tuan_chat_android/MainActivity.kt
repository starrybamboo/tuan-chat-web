package com.example.tuan_chat_newest_android

import android.annotation.TargetApi
import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var errorLayout: LinearLayout // 网络错误的时候的布局
    private lateinit var retryButton: Button       // 重试按钮

    private var uploadMessage: ValueCallback<Uri>? = null
    private var uploadMessageAboveL: ValueCallback<Array<Uri>>? = null
    private var webUrl = "http://47.119.147.6:84/" // 将URL定义为变量，方便重用

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        errorLayout = findViewById(R.id.layout_error) // 初始化错误布局
        retryButton = findViewById(R.id.button_retry)   // 初始化重试按钮

        // 启用 JavaScript与dom
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            cacheMode = WebSettings.LOAD_NO_CACHE
        }

        // 设置WebViewClient处理页面加载和错误
        webView.webViewClient = object : WebViewClient() {
            // 页面开始加载时，显示WebView，隐藏错误页
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                webView.visibility = View.VISIBLE
                errorLayout.visibility = View.GONE
            }

            // 加载错误时回调（关键逻辑）
            // 这个方法在API 23 (Marshmallow)以上被调用
            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // 只处理主页面的错误
                if (request?.isForMainFrame == true) {
                    showErrorPage()
                }
            }

            // 兼容旧版本安卓系统
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                    showErrorPage()
                }
            }
        }

        // 设置WebChromeClient处理文件选择等
        webView.webChromeClient = object : WebChromeClient() {
            // For Android < 3.0
            fun openFileChooser(valueCallback: ValueCallback<Uri>) {
                uploadMessage = valueCallback
                openImageChooserActivity()
            }

            // For Android  >= 3.0
            fun openFileChooser(valueCallback: ValueCallback<Uri>, acceptType: String) {
                uploadMessage = valueCallback
                openImageChooserActivity()
            }

            //For Android  >= 4.1
            fun openFileChooser(
                valueCallback: ValueCallback<Uri>,
                acceptType: String,
                capture: String
            ) {
                uploadMessage = valueCallback
                openImageChooserActivity()
            }

            // For Android >= 5.0
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                uploadMessageAboveL = filePathCallback
                openImageChooserActivity()
                return true
            }
        }

        // 设置重试按钮的点击事件
        retryButton.setOnClickListener {
            // 点击重试时，重新加载URL
            webView.loadUrl(webUrl)
        }

        // 初始加载 Web 应用 URL
        webView.loadUrl(webUrl)
    }

    /**
     * 显示错误页面，并隐藏WebView
     */
    private fun showErrorPage() {
        webView.visibility = View.GONE
        errorLayout.visibility = View.VISIBLE
    }

    // 处理返回键，让 WebView 可以返回上一页
    override fun onBackPressed() {
        if (webView.canGoBack() && webView.visibility == View.VISIBLE) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    private fun openImageChooserActivity() {
        val i = Intent(Intent.ACTION_GET_CONTENT)
        i.addCategory(Intent.CATEGORY_OPENABLE)
        i.type = "image/*"
        startActivityForResult(Intent.createChooser(i, "Image Chooser"), FILE_CHOOSER_RESULT_CODE)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            if (null == uploadMessage && null == uploadMessageAboveL) return
            val result = if (data == null || resultCode != Activity.RESULT_OK) null else data.data
            if (uploadMessageAboveL != null) {
                onActivityResultAboveL(requestCode, resultCode, data)
            } else if (uploadMessage != null) {
                uploadMessage!!.onReceiveValue(result)
                uploadMessage = null
            }
        }
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    private fun onActivityResultAboveL(requestCode: Int, resultCode: Int, intent: Intent?) {
        if (requestCode != FILE_CHOOSER_RESULT_CODE || uploadMessageAboveL == null)
            return
        var results: Array<Uri>? = null
        if (resultCode == Activity.RESULT_OK) {
            if (intent != null) {
                val dataString = intent.dataString
                val clipData = intent.clipData
                if (clipData != null) {
                    results = Array(clipData.itemCount){
                            i -> clipData.getItemAt(i).uri
                    }
                }
                if (dataString != null)
                    results = arrayOf(Uri.parse(dataString))
            }
        }
        uploadMessageAboveL!!.onReceiveValue(results)
        uploadMessageAboveL = null
    }

    companion object {
        private const val FILE_CHOOSER_RESULT_CODE = 10000
    }
}