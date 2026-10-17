package com.facebook.react.viewmanagers

import com.facebook.react.uimanager.ViewManagerDelegate
interface HmsScanViewManagerInterface<T> {
  fun setFormatsCsv(view: T?, value: String?)
  fun setContinuous(view: T?, value: Boolean)
  fun setPaused(view: T?, value: Boolean)
  fun setTorch(view: T?, value: Boolean)
}
class HmsScanViewManagerDelegate<T>(manager: HmsScanViewManagerInterface<T>) : ViewManagerDelegate<T>
