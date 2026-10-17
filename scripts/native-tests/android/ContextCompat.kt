package androidx.core.content

object ContextCompat {
  var failure: Exception? = null
  fun checkSelfPermission(
    context: android.content.Context,
    permission: String,
  ): Int { failure?.let { throw it }; return if (context.permissionGranted) 0 else -1 }
}
