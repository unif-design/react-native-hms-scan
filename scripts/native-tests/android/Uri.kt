package android.net

class Uri(
  private val uri: String,
) {
  val scheme = uri.substringBefore(":")
  val path: String? = uri.substringAfter("file://")

  companion object {
    fun parse(uri: String) = Uri(uri)
  }
}
