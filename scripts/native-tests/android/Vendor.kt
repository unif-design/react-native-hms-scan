package com.huawei.hms.hmsscankit

fun interface OnLightVisibleCallBack {
  fun visible(value: Boolean)
}

fun interface OnResultCallback {
  fun result(results: Array<com.huawei.hms.ml.scan.HmsScan?>?)
}

object ScanUtil {
  var entered: java.util.concurrent.CountDownLatch? = null
  var release: java.util.concurrent.CountDownLatch? = null
  var thread: String? = null
  var input: android.graphics.Bitmap? = null
  var fail = false

  fun decodeWithBitmap(
    context: android.content.Context,
    bitmap: android.graphics.Bitmap,
    options: com.huawei.hms.ml.scan.HmsScanAnalyzerOptions,
  ): Array<com.huawei.hms.ml.scan.HmsScan?> {
    thread = Thread.currentThread().name
    input = bitmap
    entered?.countDown()
    check(release?.await(5, java.util.concurrent.TimeUnit.SECONDS) != false) { "blocked SDK timed out" }
    if (fail) throw IllegalStateException("vendor failure")
    return if (bitmap.width.toLong() * bitmap.height > 52_428_800L) {
      emptyArray()
    } else {
      arrayOf(
        com.huawei.hms.ml.scan
          .HmsScan(),
      )
    }
  }
}

class RemoteView {
  var lightStatus = false
  var result: OnResultCallback? = null

  fun setOnResultCallback(cb: OnResultCallback) {
    result = cb
  }

  fun setOnLightVisibleCallback(cb: OnLightVisibleCallBack) {}

  fun onCreate(bundle: android.os.Bundle) {}

  fun onStart() {}

  fun onResume() {}

  fun onPause() {}

  fun onStop() {}

  fun onDestroy() {}

  fun pauseContinuouslyScan() {}

  fun resumeContinuouslyScan() {}

  fun switchLight() {
    lightStatus =
      !lightStatus
  }

  class Builder {
    fun setContext(activity: android.app.Activity) = this

    fun setContinuouslyScan(value: Boolean) = this

    fun setFormat(
      first: Int,
      vararg rest: Int,
    ) = this

    fun build() = RemoteView()
  }
}
