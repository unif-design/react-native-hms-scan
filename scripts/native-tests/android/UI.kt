package com.facebook.react.uimanager

class ThemedReactContext(
  val app: com.facebook.react.bridge.ReactApplicationContext,
) : android.content.Context() {
  val currentActivity get() = app.currentActivity
  val surfaceId = 7

  fun addLifecycleEventListener(listener: com.facebook.react.bridge.LifecycleEventListener) = app.addLifecycleEventListener(listener)

  fun removeLifecycleEventListener(listener: com.facebook.react.bridge.LifecycleEventListener) = app.removeLifecycleEventListener(listener)
}

object UIManagerHelper {
  val events = mutableListOf<com.facebook.react.uimanager.events.Event<*>>()

  fun getEventDispatcherForReactTag(
    context: ThemedReactContext,
    tag: Int,
  ) = Dispatcher()

  class Dispatcher {
    fun dispatchEvent(event: com.facebook.react.uimanager.events.Event<*>) {
      events.add(event)
    }
  }
}
