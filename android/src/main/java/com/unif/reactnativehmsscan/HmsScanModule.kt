package com.unif.reactnativehmsscan

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.huawei.hms.hmsscankit.ScanUtil
import com.huawei.hms.ml.scan.HmsScan
import com.huawei.hms.ml.scan.HmsScanAnalyzerOptions
import java.io.File

/**
 * TurboModule "HmsScan". Implements the codegen-generated [NativeHmsScanSpec]:
 *   - decodeImage(): decode a local image into a ScanResult[] JSON string.
 *   - getCameraPermissionStatus() / requestCameraPermission(): camera permission.
 */
class HmsScanModule(
  reactContext: ReactApplicationContext,
) : NativeHmsScanSpec(reactContext) {
  override fun getName(): String = NAME

  // ── decodeImage ──────────────────────────────────────────────────────────

  /**
   * Decode barcodes/QR codes from a local image. Loads the bitmap from a
   * readable file URI, runs ScanUtil.decodeWithBitmap
   * (photo mode), and resolves the ScanResult[] JSON. Never rejects on "no code
   * found" — it resolves an empty array, matching the JS contract.
   */
  override fun decodeImage(
    uri: String,
    formatsCsv: String,
    promise: Promise,
  ) {
    val bitmap = loadBitmap(uri)
    if (bitmap == null) {
      promise.reject(E_IMAGE_LOAD_FAILED, "Failed to load image from uri: $uri")
      return
    }

    try {
      val types = HmsScanResultMapper.parseFormatsCsv(formatsCsv)
      val optionsCreator = HmsScanAnalyzerOptions.Creator().setPhotoMode(true)
      if (types != null && types.isNotEmpty()) {
        val first = types.first()
        val rest = if (types.size > 1) types.copyOfRange(1, types.size) else IntArray(0)
        optionsCreator.setHmsScanTypes(first, *rest)
      } else {
        optionsCreator.setHmsScanTypes(HmsScan.ALL_SCAN_TYPE)
      }
      val options = optionsCreator.create()

      val scans = ScanUtil.decodeWithBitmap(reactApplicationContext, bitmap, options)
      promise.resolve(HmsScanResultMapper.toJson(scans))
    } catch (e: InvalidScanResponse) {
      promise.reject("E_INVALID_RESPONSE", e.message, e)
    } catch (e: Throwable) {
      promise.reject(E_DECODE_FAILED, e.message ?: "Failed to decode image", e)
    } finally {
      if (!bitmap.isRecycled) {
        bitmap.recycle()
      }
    }
  }

  /** Read the caller's file into a [Bitmap], or return null on failure. */
  private fun loadBitmap(uri: String): Bitmap? =
    try {
      val parsed = Uri.parse(uri)
      val path = parsed.path
      if (parsed.scheme.equals("file", ignoreCase = true) && !path.isNullOrEmpty()) decodeFile(path) else null
    } catch (e: Throwable) {
      null
    }

  private fun decodeFile(path: String): Bitmap? {
    val file = File(path)
    if (!file.exists() || !file.canRead()) return null
    return BitmapFactory.decodeFile(file.absolutePath)
  }

  // ── Camera permission ────────────────────────────────────────────────────

  /**
   * Current camera permission without prompting.
   *
   * Note: at query time Android exposes no reliable signal to distinguish
   * "blocked" / "undetermined" from a plain denial (shouldShowRequestPermissionRationale
   * is false for both the never-asked and permanently-denied states), so a
   * not-granted result is reported as "denied". The blocked/undetermined nuance is
   * resolved by requestCameraPermission() via the post-request rationale check.
   */
  override fun getCameraPermissionStatus(promise: Promise) {
    promise.resolve(if (hasCameraPermission()) GRANTED else DENIED)
  }

  /**
   * Request the camera permission (system dialog if needed) and resolve the
   * resulting status:
   *   - granted: permission held.
   *   - denied: rejected but the app may ask again (rationale should be shown).
   *   - blocked: rejected with "don't ask again" (rationale will not be shown).
   */
  override fun requestCameraPermission(promise: Promise) {
    if (hasCameraPermission()) {
      promise.resolve(GRANTED)
      return
    }

    val activity = currentActivity
    if (activity == null || activity !is PermissionAwareActivity) {
      // Can't surface a system dialog without a PermissionAwareActivity; report the
      // current (not-granted) state rather than hanging the promise.
      promise.reject(
        E_NO_ACTIVITY,
        "Cannot request camera permission: no current PermissionAwareActivity",
      )
      return
    }

    val permissionAwareActivity = activity as PermissionAwareActivity
    val listener =
      PermissionListener { requestCode, _, grantResults ->
        if (requestCode != CAMERA_PERMISSION_REQUEST_CODE) {
          return@PermissionListener false
        }
        val granted =
          grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        val status =
          when {
            granted -> GRANTED

            // After a denial: rationale==true means the user can be asked again;
            // rationale==false means "don't ask again" (blocked).
            ActivityCompat.shouldShowRequestPermissionRationale(
              activity,
              Manifest.permission.CAMERA,
            ) -> DENIED

            else -> BLOCKED
          }
        promise.resolve(status)
        true
      }

    permissionAwareActivity.requestPermissions(
      arrayOf(Manifest.permission.CAMERA),
      CAMERA_PERMISSION_REQUEST_CODE,
      listener,
    )
  }

  private fun hasCameraPermission(): Boolean =
    ContextCompat.checkSelfPermission(
      reactApplicationContext,
      Manifest.permission.CAMERA,
    ) == PackageManager.PERMISSION_GRANTED

  companion object {
    const val NAME = NativeHmsScanSpec.NAME

    private const val GRANTED = "granted"
    private const val DENIED = "denied"
    private const val BLOCKED = "blocked"

    private const val E_IMAGE_LOAD_FAILED = "E_IMAGE_LOAD_FAILED"
    private const val E_DECODE_FAILED = "E_DECODE_FAILED"
    private const val E_NO_ACTIVITY = "E_NO_ACTIVITY"

    private const val CAMERA_PERMISSION_REQUEST_CODE = 0x48_4D // "HM"
  }
}
