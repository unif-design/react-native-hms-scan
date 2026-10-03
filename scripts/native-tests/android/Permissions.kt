package com.facebook.react.modules.core

fun interface PermissionListener {
  fun onRequestPermissionsResult(
    code: Int,
    permissions: Array<String>,
    results: IntArray,
  ): Boolean
}

interface PermissionAwareActivity {
  fun requestPermissions(
    permissions: Array<String>,
    code: Int,
    listener: PermissionListener,
  )
}
