package com.unif.reactnativehmsscan

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.huawei.hms.hmsscankit.ScanUtil
import com.huawei.hms.ml.scan.HmsScan
import com.huawei.hms.ml.scan.HmsScanAnalyzerOptions
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.RejectedExecutionException
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

/** Independent image decoding and camera permission boundaries. */
class HmsScanModule(
  reactContext: ReactApplicationContext,
) : NativeHmsScanSpec(reactContext),
  LifecycleEventListener {
  // One allocated image at a time, with at most four waiting file borrowers.
  private val imageQueue =
    ThreadPoolExecutor(1, 1, 0, TimeUnit.MILLISECONDS, ArrayBlockingQueue(4)) { work ->
      Thread(work, "HmsScan-image").apply { isDaemon = true }
    }

  @Volatile private var invalidated = false

  // Permission requests and host callbacks are serialized on the UI thread.
  private class PermissionBatch(
    val activity: Activity,
    val promises: MutableList<Promise>,
  )

  private var permissionBatch: PermissionBatch? = null

  override fun getName(): String = NAME

  override fun decodeImage(
    uri: String,
    formatsCsv: String,
    promise: Promise,
  ) {
    val work = ImageWork(uri, formatsCsv, promise)
    synchronized(imageQueue) {
      if (invalidated) {
        work.rejectUnavailable()
        return
      }
      try {
        imageQueue.execute(work)
      } catch (_: RejectedExecutionException) {
        work.rejectUnavailable()
      }
    }
  }

  private inner class ImageWork(
    val uri: String,
    val formatsCsv: String,
    val promise: Promise,
  ) : Runnable {
    fun rejectUnavailable() {
      promise.reject("E_UNAVAILABLE", "图片识别不可用或等待队列已满")
    }

    override fun run() {
      if (invalidated) {
        rejectUnavailable()
        return
      }
      try {
        // use closes the bitmap before the promise settles and the caller releases its file.
        val json =
          HmsScanImage.read(uri).use { image ->
            val types = HmsScanResultMapper.parseFormatsCsv(formatsCsv)
            val creator = HmsScanAnalyzerOptions.Creator().setPhotoMode(true)
            if (types != null && types.isNotEmpty()) {
              creator.setHmsScanTypes(types.first(), *types.drop(1).toIntArray())
            } else {
              creator.setHmsScanTypes(HmsScan.ALL_SCAN_TYPE)
            }
            val scans = ScanUtil.decodeWithBitmap(reactApplicationContext, image.bitmap, creator.create())
            HmsScanResultMapper.toJson(scans, image.scaleX, image.scaleY)
          }
        promise.resolve(json)
      } catch (error: ScanImageFailure) {
        promise.reject(error.code, error.message, error)
      } catch (error: InvalidScanResponse) {
        promise.reject("E_INVALID_RESPONSE", error.message, error)
      } catch (error: Exception) {
        promise.reject("E_DECODE_FAILED", error.message ?: "图片识别失败", error)
      } catch (error: OutOfMemoryError) {
        promise.reject("E_DECODE_FAILED", "图片识别内存不足", error)
      }
    }
  }

  /** Android does not distinguish never asked from blocked in a read-only query. */
  override fun getCameraPermissionStatus(promise: Promise) {
    try {
      promise.resolve(if (hasCameraPermission()) GRANTED else DENIED)
    } catch (error: Exception) {
      promise.reject("E_UNAVAILABLE", "读取相机权限失败", error)
    }
  }

  override fun requestCameraPermission(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (invalidated) {
        promise.reject("E_UNAVAILABLE", "扫码模块已释放")
        return@runOnUiThread
      }
      try {
        if (hasCameraPermission()) {
          promise.resolve(GRANTED)
          return@runOnUiThread
        }
        val activity = reactApplicationContext.currentActivity
        if (activity !is PermissionAwareActivity) {
          promise.reject("E_NO_ACTIVITY", "没有可申请相机权限的界面")
          return@runOnUiThread
        }
        permissionBatch?.let { pending ->
          if (pending.activity === activity) {
            pending.promises.add(promise)
            return@runOnUiThread
          }
          rejectPermissions(pending, "E_NO_ACTIVITY", "相机权限所属界面已结束")
        }
        val batch = PermissionBatch(activity, mutableListOf(promise))
        permissionBatch = batch
        reactApplicationContext.addLifecycleEventListener(this)
        val listener =
          PermissionListener { requestCode, _, grantResults ->
            if (requestCode != CAMERA_PERMISSION_REQUEST_CODE) {
              return@PermissionListener false
            }
            if (permissionBatch !== batch) return@PermissionListener true
            if (grantResults.isEmpty()) {
              rejectPermissions(batch, "E_UNAVAILABLE", "相机权限申请未完成")
            } else {
              val status =
                when {
                  grantResults[0] == PackageManager.PERMISSION_GRANTED -> GRANTED
                  ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.CAMERA) -> DENIED
                  else -> BLOCKED
                }
              finishPermissions(batch).forEach { it.resolve(status) }
            }
            true
          }
        try {
          activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), CAMERA_PERMISSION_REQUEST_CODE, listener)
        } catch (error: Exception) {
          rejectPermissions(batch, "E_UNAVAILABLE", error.message ?: "申请相机权限失败")
        }
      } catch (error: Exception) {
        promise.reject("E_UNAVAILABLE", "申请相机权限失败", error)
      }
    }
  }

  private fun finishPermissions(batch: PermissionBatch): List<Promise> {
    if (permissionBatch !== batch) return emptyList()
    permissionBatch = null
    reactApplicationContext.removeLifecycleEventListener(this)
    return batch.promises.toList().also { batch.promises.clear() }
  }

  private fun rejectPermissions(
    batch: PermissionBatch,
    code: String,
    message: String,
  ) {
    finishPermissions(batch).forEach { it.reject(code, message) }
  }

  override fun onHostResume() = Unit

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    permissionBatch?.let { rejectPermissions(it, "E_NO_ACTIVITY", "相机权限所属界面已结束") }
  }

  override fun invalidate() {
    val waiting = mutableListOf<Runnable>()
    synchronized(imageQueue) {
      invalidated = true
      imageQueue.queue.drainTo(waiting)
      // Do not interrupt an active vendor read or return its file before it finishes.
      imageQueue.shutdown()
    }
    waiting.forEach { (it as ImageWork).rejectUnavailable() }
    UiThreadUtil.runOnUiThread {
      permissionBatch?.let { rejectPermissions(it, "E_UNAVAILABLE", "扫码模块已释放") }
    }
    super.invalidate()
  }

  private fun hasCameraPermission(): Boolean =
    ContextCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

  companion object {
    const val NAME = NativeHmsScanSpec.NAME
    private const val GRANTED = "granted"
    private const val DENIED = "denied"
    private const val BLOCKED = "blocked"
    private const val CAMERA_PERMISSION_REQUEST_CODE = 0x48_4D
  }
}
