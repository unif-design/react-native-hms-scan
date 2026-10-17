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
  var failure: Throwable? = null
  var response: Array<com.huawei.hms.ml.scan.HmsScan?>? = null

  fun decodeWithBitmap(
    context: android.content.Context,
    bitmap: android.graphics.Bitmap,
    options: com.huawei.hms.ml.scan.HmsScanAnalyzerOptions,
  ): Array<com.huawei.hms.ml.scan.HmsScan?> {
    thread = Thread.currentThread().name
    input = bitmap
    entered?.countDown()
    check(release?.await(5, java.util.concurrent.TimeUnit.SECONDS) != false) { "blocked SDK timed out" }
    failure?.let { throw it }
    response?.let { return it }
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
  companion object {
    var throwsOnSwitchLight = false
    var rejectsSwitchLight = false
    var switchLightCalls = 0
    val instances = mutableListOf<RemoteView>()
    var failureOnBuild: Throwable? = null
    var failureOnPause: Throwable? = null
    var failureOnDestroy: Throwable? = null
    var failureOnReadLight: Throwable? = null
  }

  private var light = false
  var lightStatus: Boolean
    get() { failureOnReadLight?.let { throw it }; return light }
    set(value) { light = value }
  var lightCallback: OnLightVisibleCallBack? = null
  var result: OnResultCallback? = null

  fun setOnResultCallback(cb: OnResultCallback) {
    result = cb
  }

  fun setOnLightVisibleCallback(cb: OnLightVisibleCallBack) { lightCallback = cb }

  fun onCreate(bundle: android.os.Bundle) {}

  fun onStart() {}

  fun onResume() {}

  fun onPause() {}

  fun onStop() {}

  fun onDestroy() { failureOnDestroy?.let { throw it } }

  fun pauseContinuouslyScan() { failureOnPause?.let { throw it } }

  fun resumeContinuouslyScan() { failureOnPause?.let { throw it } }

  fun switchLight(): Boolean {
    switchLightCalls++
    check(!throwsOnSwitchLight) { "torch command failed" }
    // Scan Kit also returns false for a missing delegate or a caught RemoteException.
    if (rejectsSwitchLight) return false
    lightStatus =
      !lightStatus
    return true
  }

  class Builder {
    fun setContext(activity: android.app.Activity) = this

    fun setContinuouslyScan(value: Boolean) = this

    fun setFormat(
      first: Int,
      vararg rest: Int,
    ) = this

    fun build(): RemoteView { failureOnBuild?.let { throw it }; return RemoteView().also { instances.add(it) } }
  }
}
