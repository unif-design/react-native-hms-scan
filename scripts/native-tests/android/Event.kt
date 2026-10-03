package com.facebook.react.uimanager.events

abstract class Event<T>(
  surfaceId: Int,
  viewTag: Int,
) {
  abstract fun getEventName(): String

  abstract fun getEventData(): com.facebook.react.bridge.WritableMap
}
