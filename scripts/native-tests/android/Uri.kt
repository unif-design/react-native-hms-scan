package android.net

class Uri(
  private val uri: String,
) {
  val scheme = uri.substringBefore(":")
  // Android Uri treats a scheme without a leading slash as opaque (no path).
  private val remainder = uri.substringAfter(':')
  val path: String? = when {
    remainder.startsWith("//") -> remainder.drop(2).let { if (it.startsWith('/')) it else it.substringAfter('/', "") }
    remainder.startsWith('/') -> remainder
    else -> null
  }

  companion object {
    fun parse(uri: String) = Uri(uri)
  }
}
