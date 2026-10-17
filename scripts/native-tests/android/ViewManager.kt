package com.facebook.react.uimanager

open class ViewManager<T, U>
interface ViewManagerDelegate<T>
abstract class SimpleViewManager<T> : ViewManager<T, Any>() {
  abstract fun getDelegate(): ViewManagerDelegate<T>
  abstract fun getName(): String
  abstract fun createViewInstance(context: ThemedReactContext): T
  open fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> = emptyMap()
}
