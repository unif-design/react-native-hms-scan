package com.unif.reactnativehmsscan

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package wiring for @unif/react-native-hms-scan:
 *   - the "HmsScan" TurboModule ([HmsScanModule]) —— 图片识别 + 相机权限。
 *   - the "HmsScanView" Fabric 视图 ([HmsScanViewManager]) —— 定制视图扫码。
 *
 * 结构对齐官方 create-react-native-library 模板：模块走 getModule /
 * getReactModuleInfoProvider，视图走 createViewManagers + listOf(ViewManager)。
 */
class ReactNativeHmsScanPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == HmsScanModule.NAME) {
      HmsScanModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider() =
    ReactModuleInfoProvider {
      mapOf(
        HmsScanModule.NAME to
          ReactModuleInfo(
            name = HmsScanModule.NAME,
            className = HmsScanModule.NAME,
            canOverrideExistingModule = false,
            needsEagerInit = false,
            isCxxModule = false,
            isTurboModule = true,
          ),
      )
    }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = listOf(HmsScanViewManager())
}
