package com.unif.reactnativehmsscan

abstract class NativeHmsScanSpec(
  val reactApplicationContext: com.facebook.react.bridge.ReactApplicationContext,
) {
  val currentActivity get() = reactApplicationContext.currentActivity

  abstract fun getName(): String

  abstract fun decodeImage(
    uri: String,
    formatsCsv: String,
    promise: com.facebook.react.bridge.Promise,
  )

  abstract fun getCameraPermissionStatus(promise: com.facebook.react.bridge.Promise)

  abstract fun requestCameraPermission(promise: com.facebook.react.bridge.Promise)

  open fun invalidate() {}

  companion object {
    const val NAME = "HmsScan"
  }
}
