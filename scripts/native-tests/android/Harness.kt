import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ExifInterface
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.huawei.hms.hmsscankit.ScanUtil
import com.unif.reactnativehmsscan.HmsScanModule
import com.unif.reactnativehmsscan.HmsScanView
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class RecordingPromise : Promise {
  val values = mutableListOf<Any?>()
  val done = CountDownLatch(1)

  override fun resolve(value: Any?) {
    values.add(value)
    done.countDown()
  }

  override fun reject(
    code: String,
    message: String?,
  ) {
    values.add("reject:" + code)
    done.countDown()
  }

  override fun reject(
    code: String,
    message: String?,
    e: Throwable,
  ) {
    reject(code, message)
  }

  fun await(): Any? {
    check(done.await(5, TimeUnit.SECONDS)) { "Promise did not settle" }
    return values.single()
  }
}

// RN 0.86 ReactActivityDelegate stores one permission listener, not one per request code.
class Activity :
  android.app.Activity(),
  PermissionAwareActivity {
  var listener: PermissionListener? = null
  var requests = 0

  override fun requestPermissions(
    permissions: Array<String>,
    code: Int,
    listener: PermissionListener,
  ) {
    this.listener = listener
    requests++
  }

  fun reply() {
    if (listener?.onRequestPermissionsResult(0x484D, arrayOf("camera"), intArrayOf(0)) == true) listener = null
  }
}

fun main() {
  var failures = 0

  fun test(
    name: String,
    body: () -> Unit,
  ) {
    try {
      body()
      println("PASS: " + name)
    } catch (error: Throwable) {
      failures++
      println("FAIL: " + name + ": " + error.message)
    }
  }
  test("detached views release lifecycle listeners and can reattach") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    val ctx = ThemedReactContext(app)
    repeat(100) {
      val view = HmsScanView(ctx)
      view.onAttachedToWindow()
      view.onDetachedFromWindow()
    }
    check(app.listeners.isEmpty()) { "retained " + app.listeners.size + " detached views" }
    val view = HmsScanView(ctx)
    view.onAttachedToWindow()
    view.onDetachedFromWindow()
    view.onAttachedToWindow()
    check(app.listeners.size == 1)
    view.onDetachedFromWindow()
    check(app.listeners.isEmpty())
  }
  test("unchanged torch reports cross the bridge once") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    UIManagerHelper.events.clear()
    val view = HmsScanView(ThemedReactContext(app))
    view.onAttachedToWindow()
    view.setTorch(false)
    view.setTorch(false)
    view.onHostResume()
    check(UIManagerHelper.events.count { it.getEventName() == "topTorchState" } == 1)
    view.onDetachedFromWindow()
  }
  test("concurrent camera requests share one prompt and both settle") {
    val app = ReactApplicationContext()
    val activity = Activity()
    app.currentActivity = activity
    val module = HmsScanModule(app)
    val first = RecordingPromise()
    val second = RecordingPromise()
    module.requestCameraPermission(first)
    module.requestCameraPermission(second)
    activity.reply()
    activity.reply()
    check(activity.requests == 1) { "started " + activity.requests + " prompts" }
    check(first.await() == "granted")
    check(second.await() == "granted")
    module.invalidate()
  }
  test("host destruction rejects pending permission borrowers") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    val module = HmsScanModule(app)
    val result = RecordingPromise()
    module.requestCameraPermission(result)
    app.listeners.toList().forEach { it.onHostDestroy() }
    check(result.await() == "reject:E_NO_ACTIVITY")
    check(app.listeners.isEmpty())
    module.invalidate()
  }
  val image = java.io.File.createTempFile("scan-native-", ".jpg")

  fun decode(
    width: Int,
    height: Int,
    orientation: Int = 1,
  ): Any? {
    BitmapFactory.width = width
    BitmapFactory.height = height
    BitmapFactory.largestPixels = 0
    BitmapFactory.pixelReads = 0
    BitmapFactory.fail = false
    Bitmap.created.clear()
    ExifInterface.orientation = orientation
    ScanUtil.fail = false
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    val value = result.await()
    module.invalidate()
    return value
  }
  test("large image is sampled before allocation and returns original image coordinates") {
    val value = decode(9000, 6000)
    check(BitmapFactory.largestPixels <= 8388608L) { "allocated " + BitmapFactory.largestPixels + " pixels" }
    check(value.toString().contains("\"value\":\"code\""))
    check(value.toString().contains("\"x\":40.0"))
    check(value.toString().contains("\"y\":80.0"))
    check(Bitmap.created.all { it.isRecycled })
  }
  test("EXIF rotation uses upright pixels and keeps coordinate scale") {
    val value = decode(9000, 6000, 6)
    check(ScanUtil.input?.width == 1500 && ScanUtil.input?.height == 2250) { "vendor received unrotated bitmap" }
    check(value.toString().contains("\"x\":40.0"))
    check(value.toString().contains("\"y\":80.0"))
    check(Bitmap.created.all { it.isRecycled })
  }
  test("270 degree EXIF and non-divisible sampling map to upright source coordinates") {
    val value = decode(9001, 6001, 8).toString()
    check(ScanUtil.input?.width == 1501 && ScanUtil.input?.height == 2251)
    val x = Regex("\"x\":([0-9.]+)").find(value)!!.groupValues[1].toDouble()
    val y = Regex("\"y\":([0-9.]+)").find(value)!!.groupValues[1].toDouble()
    // Hand-calculated in upright original pixels: 10 * 6001 / 1501, 20 * 9001 / 2251.
    check(kotlin.math.abs(x - 39.98001332445) < 0.000000001)
    check(kotlin.math.abs(y - 79.97334517992) < 0.000000001)
    check(Bitmap.created.all { it.isRecycled })
  }
  test("unreasonable dimensions fail before full pixel allocation") {
    val value = decode(1000000, 1000000)
    check(value == "reject:E_INVALID_INPUT") { "oversized input returned " + value }
    check(BitmapFactory.pixelReads == 0) { "started full image read" }
  }
  test("image decoding leaves the caller thread") {
    decode(640, 480)
    check(ScanUtil.thread != null && ScanUtil.thread != Thread.currentThread().name) { "decode stayed on caller thread" }
  }
  test("bounded queue rejects overflow and invalidation preserves the active read") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 1
    val entered = CountDownLatch(1)
    val release = CountDownLatch(1)
    ScanUtil.entered = entered
    ScanUtil.release = release
    val module = HmsScanModule(ReactApplicationContext())
    val active = RecordingPromise()
    try {
      module.decodeImage("file://" + image.absolutePath, "", active)
      check(entered.await(2, TimeUnit.SECONDS))
      val waiting = List(4) { RecordingPromise().also { module.decodeImage("file://" + image.absolutePath, "", it) } }
      val overflow = RecordingPromise()
      module.decodeImage("file://" + image.absolutePath, "", overflow)
      check(overflow.await() == "reject:E_UNAVAILABLE")
      module.invalidate()
      waiting.forEach { check(it.await() == "reject:E_UNAVAILABLE") }
      check(active.done.count == 1L)
      check(Bitmap.created.none { it.isRecycled })
      release.countDown()
      check(active.await().toString().contains("code"))
      check(Bitmap.created.all { it.isRecycled })
    } finally {
      release.countDown()
      module.invalidate()
      ScanUtil.entered = null
      ScanUtil.release = null
    }
  }
  test("vendor failure recycles the borrowed bitmap before rejection") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 1
    ScanUtil.fail = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await() == "reject:E_DECODE_FAILED")
    check(Bitmap.created.all { it.isRecycled })
    module.invalidate()
    ScanUtil.fail = false
  }
  test("failed EXIF allocation recycles the source once") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 6
    Bitmap.transformFailure = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await() == "reject:E_DECODE_FAILED")
    check(Bitmap.created.single().recycleCount == 1)
    module.invalidate()
    Bitmap.transformFailure = false
  }
  test("a platform transform returning its input is released once") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 2
    Bitmap.sameInstance = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await().toString().contains("code"))
    check(Bitmap.created.single().recycleCount == 1)
    module.invalidate()
    Bitmap.sameInstance = false
  }
  test("module invalidation settles permission waiters and ignores their late callback") {
    val app = ReactApplicationContext()
    val activity = Activity()
    app.currentActivity = activity
    val module = HmsScanModule(app)
    val result = RecordingPromise()
    module.requestCameraPermission(result)
    module.invalidate()
    check(result.await() == "reject:E_UNAVAILABLE")
    activity.reply()
    check(result.values.size == 1)
    check(app.listeners.isEmpty())
  }
  image.delete()
  check(failures == 0) { "$failures native behavior failures" }
}
