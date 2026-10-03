package android.content.pm

class PackageManager {
  fun hasSystemFeature(name: String) = true

  companion object {
    const val PERMISSION_GRANTED = 0
    const val FEATURE_CAMERA_FLASH = "flash"
  }
}
