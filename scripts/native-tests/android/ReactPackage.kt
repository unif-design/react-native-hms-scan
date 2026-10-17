package com.facebook.react

import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
abstract class BaseReactPackage {
  abstract fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule?
  abstract fun getReactModuleInfoProvider(): ReactModuleInfoProvider
  abstract fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>>
}
