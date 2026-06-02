package com.unif.reactnativehmsscan

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.HmsScanViewManagerDelegate
import com.facebook.react.viewmanagers.HmsScanViewManagerInterface

/**
 * Fabric ViewManager for "HmsScanView". Delegates prop dispatch to the
 * codegen-generated [HmsScanViewManagerDelegate] and forwards each prop to the
 * underlying [HmsScanView].
 */
@ReactModule(name = HmsScanViewManager.NAME)
class HmsScanViewManager :
  SimpleViewManager<HmsScanView>(),
  HmsScanViewManagerInterface<HmsScanView> {
  private val mDelegate: ViewManagerDelegate<HmsScanView> =
    HmsScanViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<HmsScanView> = mDelegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): HmsScanView = HmsScanView(context)

  @ReactProp(name = "formatsCsv")
  override fun setFormatsCsv(
    view: HmsScanView?,
    value: String?,
  ) {
    view?.setFormatsCsv(value)
  }

  @ReactProp(name = "continuous", defaultBoolean = true)
  override fun setContinuous(
    view: HmsScanView?,
    value: Boolean,
  ) {
    view?.setContinuous(value)
  }

  @ReactProp(name = "paused", defaultBoolean = false)
  override fun setPaused(
    view: HmsScanView?,
    value: Boolean,
  ) {
    view?.setPaused(value)
  }

  @ReactProp(name = "torch", defaultBoolean = false)
  override fun setTorch(
    view: HmsScanView?,
    value: Boolean,
  ) {
    view?.setTorch(value)
  }

  /**
   * Map internal Fabric event names to the JS prop callback names declared in
   * HmsScanViewNativeComponent.ts.
   */
  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(
      "topScanResult" to mapOf("registrationName" to "onScanResult"),
      "topScanError" to mapOf("registrationName" to "onScanError"),
      "topTorchStatus" to mapOf("registrationName" to "onTorchStatus"),
    )

  companion object {
    const val NAME = "HmsScanView"
  }
}
