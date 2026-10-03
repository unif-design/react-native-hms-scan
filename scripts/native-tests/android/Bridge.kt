package com.facebook.react.bridge

interface Promise {
  fun resolve(value: Any?)

  fun reject(
    code: String,
    message: String?,
  )

  fun reject(
    code: String,
    message: String?,
    e: Throwable,
  )
}

interface LifecycleEventListener {
  fun onHostResume()

  fun onHostPause()

  fun onHostDestroy()
}

open class ReactApplicationContext : android.content.Context() {
  var currentActivity: android.app.Activity? = null
  val listeners = linkedSetOf<LifecycleEventListener>()

  open fun addLifecycleEventListener(listener: LifecycleEventListener) {
    listeners.add(listener)
  }

  open fun removeLifecycleEventListener(listener: LifecycleEventListener) {
    listeners.remove(listener)
  }
}

object UiThreadUtil {
  fun runOnUiThread(action: Runnable) {
    action.run()
  }
}

class WritableMap {
  val entries = linkedMapOf<String, Any?>()

  fun putString(
    k: String,
    v: String,
  ) {
    entries[k] = v
  }

  fun putBoolean(
    k: String,
    v: Boolean,
  ) {
    entries[k] =
      v
  }
}

object Arguments {
  fun createMap() = WritableMap()
}
