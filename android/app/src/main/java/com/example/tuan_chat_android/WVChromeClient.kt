package com.example.tuan_chat_android

import android.annotation.TargetApi
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView

class WVChromeClient(var context: Context?, var _m: MainActivity) : WebChromeClient() {
    private var uploadFiles: ValueCallback<Array<Uri?>?>? = null


    // 第二种方式（过滤文件格式）
    override fun onShowFileChooser(
        webView: WebView?, filePathCallback: ValueCallback<Array<Uri?>?>?,
        fileChooserParams: FileChooserParams?
    ): Boolean {
        uploadFiles = filePathCallback
        val i = Intent(Intent.ACTION_GET_CONTENT)
        i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        i.setType("*/*") // 设置文件类型
        val mimeTypes = arrayOf<String?>("image/*,audio/*,video/*,*/*")
        i.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes) // 设置多种类型
        i.addCategory(Intent.CATEGORY_OPENABLE)
        _m.startActivityForResult(Intent.createChooser(i, "Image Chooser"), CHOOSER_REQUEST)
        return true
    }

    // 文件选择回调（在 MainActivity.java 的 onActivityResult中调用此方法）
    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    fun onActivityResultFileChooser(requestCode: Int, resultCode: Int, intent: Intent?) {
        if (requestCode != CHOOSER_REQUEST || uploadFiles == null) return
        var results: Array<Uri?>? = null
        if (resultCode == Activity.RESULT_OK) {
            if (intent != null) {
                val dataString = intent.getDataString()
                val clipData = intent.getClipData()
                if (clipData != null) {
                    results = arrayOfNulls<Uri>(clipData.getItemCount())
                    for (i in 0..<clipData.getItemCount()) {
                        val item = clipData.getItemAt(i)
                        results[i] = item.getUri()
                    }
                }
                if (dataString != null) results = arrayOf<Uri?>(Uri.parse(dataString))
            }
        }
        uploadFiles!!.onReceiveValue(results)
        uploadFiles = null
    }

    companion object {
        private const val TAG = "WebChromeClient："
        const val CHOOSER_REQUEST: Int = 0x33
    }
}