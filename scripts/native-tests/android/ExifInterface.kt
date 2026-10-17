package android.media

class ExifInterface(
  stream: java.io.InputStream,
) {
  fun getAttributeInt(
    name: String,
    default: Int,
  ): Int { if (fail) throw java.io.IOException("bad EXIF"); return orientation }

  companion object {
    var orientation = 1
    var fail = false
    const val TAG_ORIENTATION = "Orientation"
    const val ORIENTATION_NORMAL = 1
    const val ORIENTATION_FLIP_HORIZONTAL = 2
    const val ORIENTATION_ROTATE_180 = 3
    const val ORIENTATION_FLIP_VERTICAL = 4
    const val ORIENTATION_TRANSPOSE = 5
    const val ORIENTATION_ROTATE_90 = 6
    const val ORIENTATION_TRANSVERSE = 7
    const val ORIENTATION_ROTATE_270 = 8
  }
}
