package androidx.core.content

object ContextCompat {
  fun checkSelfPermission(
    context: android.content.Context,
    permission: String,
  ) = if (context.permissionGranted) 0 else -1
}
