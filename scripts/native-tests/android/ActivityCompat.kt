package androidx.core.app

object ActivityCompat {
  var showRationale = true
  fun shouldShowRequestPermissionRationale(
    activity: android.app.Activity,
    permission: String,
  ) = showRationale
}
