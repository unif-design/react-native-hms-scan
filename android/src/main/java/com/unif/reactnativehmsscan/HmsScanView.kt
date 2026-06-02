package com.unif.reactnativehmsscan

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.huawei.hms.hmsscankit.OnLightVisibleCallBack
import com.huawei.hms.hmsscankit.OnResultCallback
import com.huawei.hms.hmsscankit.RemoteView
import com.huawei.hms.ml.scan.HmsScan

/**
 * Fabric view "HmsScanView". A FrameLayout that hosts HUAWEI Scan Kit's
 * [RemoteView] (a blank camera preview). Scanning UI (viewfinder, torch button,
 * etc.) is drawn on top by the JS layer; this view only renders the preview and
 * emits scan/torch/error events.
 *
 * RemoteView is built lazily on first attach (so all initial props are known) and
 * rebuilt when its build-time props (formatsCsv / continuous) change. Lifecycle is
 * forwarded both from the View attach/detach callbacks and from the host
 * Activity's lifecycle via [LifecycleEventListener].
 */
class HmsScanView(
  context: Context,
) : FrameLayout(context),
  LifecycleEventListener {
  private val themedReactContext: ThemedReactContext = context as ThemedReactContext

  private var remoteView: RemoteView? = null

  // Build-time props (require a RemoteView rebuild when changed).
  private var formatsCsv: String = ""
  private var continuous: Boolean = true

  // Runtime props (applied to the live RemoteView; stashed until it exists).
  private var paused: Boolean = false
  private var torch: Boolean = false

  // True while this view is between onAttachedToWindow and onDetachedFromWindow.
  private var attached: Boolean = false

  init {
    themedReactContext.addLifecycleEventListener(this)
  }

  // ── Props (called from the ViewManager) ───────────────────────────────────

  fun setFormatsCsv(value: String?) {
    val next = value ?: ""
    if (next == formatsCsv && remoteView != null) return
    formatsCsv = next
    rebuildIfAttached()
  }

  fun setContinuous(value: Boolean) {
    if (value == continuous && remoteView != null) return
    continuous = value
    rebuildIfAttached()
  }

  fun setPaused(value: Boolean) {
    paused = value
    applyPaused()
  }

  fun setTorch(value: Boolean) {
    torch = value
    applyTorch()
  }

  // ── View lifecycle ────────────────────────────────────────────────────────

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    attached = true
    if (remoteView == null) {
      buildRemoteView()
    }
    remoteView?.let {
      it.onStart()
      it.onResume()
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    attached = false
    teardownRemoteView()
  }

  // ── Host (Activity) lifecycle ─────────────────────────────────────────────

  override fun onHostResume() {
    if (attached) {
      remoteView?.onResume()
    }
  }

  override fun onHostPause() {
    remoteView?.onPause()
  }

  override fun onHostDestroy() {
    teardownRemoteView()
    themedReactContext.removeLifecycleEventListener(this)
  }

  // ── RemoteView build / teardown ───────────────────────────────────────────

  private fun buildRemoteView() {
    val activity = resolveActivity()
    if (activity == null) {
      emitError(
        "E_CAMERA_INIT",
        "Cannot start camera: no host Activity available for RemoteView",
      )
      return
    }

    try {
      val builder =
        RemoteView
          .Builder()
          .setContext(activity)
          .setContinuouslyScan(continuous)

      val types = HmsScanResultMapper.parseFormatsCsv(formatsCsv)
      if (types != null && types.isNotEmpty()) {
        val first = types.first()
        val rest = if (types.size > 1) types.copyOfRange(1, types.size) else IntArray(0)
        builder.setFormat(first, *rest)
      } else {
        builder.setFormat(HmsScan.ALL_SCAN_TYPE)
      }

      val view = builder.build()

      view.setOnResultCallback(OnResultCallback { result -> onScanResult(result) })
      view.setOnLightVisibleCallback(
        OnLightVisibleCallBack { visible -> onTorchVisible(visible) },
      )

      // onCreate must run after build() and before addView (per HMS docs/demo).
      view.onCreate(Bundle())
      addView(
        view,
        LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
      )

      remoteView = view

      // Apply runtime props that may have arrived before the view existed.
      applyPaused()
      applyTorch()
    } catch (e: Throwable) {
      emitError("E_CAMERA_INIT", e.message ?: "Failed to initialize camera")
    }
  }

  private fun teardownRemoteView() {
    val view = remoteView ?: return
    try {
      view.onPause()
      view.onStop()
      view.onDestroy()
    } catch (_: Throwable) {
      // Defensive: never let teardown crash the host.
    }
    removeView(view)
    remoteView = null
  }

  /** Rebuild the RemoteView in place to honour a changed build-time prop. */
  private fun rebuildIfAttached() {
    if (!attached) return
    teardownRemoteView()
    buildRemoteView()
    remoteView?.let {
      it.onStart()
      it.onResume()
    }
  }

  private fun applyPaused() {
    val view = remoteView ?: return
    try {
      if (paused) {
        view.pauseContinuouslyScan()
      } else {
        view.resumeContinuouslyScan()
      }
    } catch (_: Throwable) {
      // Ignore: only meaningful in continuous mode.
    }
  }

  private fun applyTorch() {
    val view = remoteView ?: return
    try {
      // switchLight() toggles; only flip when the current state differs from target.
      if (view.lightStatus != torch) {
        view.switchLight()
      }
    } catch (_: Throwable) {
      // Ignore: device may have no flash.
    }
  }

  /** Resolve the hosting Activity required by RemoteView.Builder.setContext(). */
  private fun resolveActivity(): Activity? = themedReactContext.currentActivity

  // ── Scan Kit callbacks → Fabric events ────────────────────────────────────

  private fun onScanResult(result: Array<HmsScan?>?) {
    // Drop empty callbacks (continuous mode can fire with nothing useful).
    if (result == null || result.isEmpty()) return
    val json = HmsScanResultMapper.toJson(result)
    // toJson skips value-less hits; avoid emitting an empty "[]" event.
    if (json == "[]") return
    emitEvent(
      "topScanResult",
      Arguments.createMap().apply {
        putString("resultsJson", json)
      },
    )
  }

  private fun onTorchVisible(visible: Boolean) {
    // Keep our cached torch flag in sync with the actual hardware state.
    val on = remoteView?.lightStatus ?: torch
    torch = on
    emitEvent(
      "topTorchStatus",
      Arguments.createMap().apply {
        putBoolean("available", visible)
        putBoolean("on", on)
      },
    )
  }

  private fun emitError(
    code: String,
    message: String,
  ) {
    emitEvent(
      "topScanError",
      Arguments.createMap().apply {
        putString("code", code)
        putString("message", message)
      },
    )
  }

  // ── Fabric event dispatch ──────────────────────────────────────────────────

  private fun emitEvent(
    eventName: String,
    payload: WritableMap,
  ) {
    val reactTag = id
    val dispatcher =
      UIManagerHelper.getEventDispatcherForReactTag(themedReactContext, reactTag)
    val surfaceId = themedReactContext.surfaceId
    dispatcher?.dispatchEvent(ScanEvent(surfaceId, reactTag, eventName, payload))
  }

  // RN 0.85 的 Event<T : Event<T>> 是自递归泛型(CRTP),必须用命名子类 Event<Self>;
  // 匿名 object : Event<Event<*>> 不满足该 bound(0.85 起加严,旧版 bound 宽松能编)。
  private class ScanEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val data: WritableMap,
  ) : Event<ScanEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name

    override fun getEventData(): WritableMap = data
  }
}
